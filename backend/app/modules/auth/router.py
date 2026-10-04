from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from app.core import rate_limit
from app.core.deps import CurrentUser, DbSession, client_ip
from app.core.rate_limit import RateLimiter, get_rate_limiter
from app.modules.auth import service
from app.modules.auth.cookies import (
    clear_refresh_cookie,
    read_refresh_cookie,
    require_cookie_csrf,
    set_refresh_cookie,
)
from app.modules.auth.schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SessionResponse,
    UserOut,
)
from app.modules.notifications.email import EmailSender, get_email_sender
from app.modules.users import service as users_service
from app.modules.users.schemas import ChangePasswordRequest

router = APIRouter(prefix="/auth", tags=["auth"])

Limiter = Annotated[RateLimiter, Depends(get_rate_limiter)]
Sender = Annotated[EmailSender, Depends(get_email_sender)]


def _client(request: Request) -> service.ClientInfo:
    return service.ClientInfo(ip=client_ip(request), user_agent=request.headers.get("user-agent"))


def _session_response(response: Response, session: service.IssuedSession) -> SessionResponse:
    set_refresh_cookie(response, session.refresh_token)
    return SessionResponse(
        user=UserOut.model_validate(session.user),
        access_token=session.access.token,
        expires_in=session.access.expires_in,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    body: RegisterRequest, request: Request, response: Response, db: DbSession, limiter: Limiter
) -> SessionResponse:
    limiter.hit(rate_limit.REGISTER, client_ip(request))
    return _session_response(response, service.register(db, body, _client(request)))


@router.post("/login")
def login(
    body: LoginRequest, request: Request, response: Response, db: DbSession, limiter: Limiter
) -> SessionResponse:
    limiter.hit(rate_limit.LOGIN, client_ip(request), body.email)
    return _session_response(
        response, service.login(db, body.email, body.password, _client(request))
    )


@router.post("/refresh", dependencies=[Depends(require_cookie_csrf)])
def refresh(
    request: Request, response: Response, db: DbSession, limiter: Limiter
) -> SessionResponse:
    """Exchange the refresh cookie for a new access token (and a new cookie)."""
    limiter.hit(rate_limit.REFRESH, client_ip(request))
    session = service.refresh(db, read_refresh_cookie(request), _client(request))
    return _session_response(response, session)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_cookie_csrf)],
)
def logout(request: Request, response: Response, db: DbSession) -> None:
    service.logout(db, read_refresh_cookie(request))
    clear_refresh_cookie(response)


@router.post("/logout-all", status_code=status.HTTP_204_NO_CONTENT)
def logout_all(user: CurrentUser, response: Response, db: DbSession) -> None:
    """Sign out on every device."""
    service.logout_everywhere(db, user)
    clear_refresh_cookie(response)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    body: ChangePasswordRequest,
    request: Request,
    user: CurrentUser,
    db: DbSession,
    sender: Sender,
) -> None:
    """Signs out other devices; this one stays signed in. Lives under /auth so
    the browser sends the refresh cookie that identifies "this one"."""
    keep = service.current_family(db, read_refresh_cookie(request), user)
    users_service.change_password(
        db, user, body.current_password, body.new_password, keep_family=keep, sender=sender
    )


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    db: DbSession,
    limiter: Limiter,
    sender: Sender,
) -> dict[str, str]:
    limiter.hit(rate_limit.FORGOT_PASSWORD, client_ip(request), body.email)
    service.request_password_reset(db, body.email, sender)
    return {"message": "If an account exists for this email, we've sent a reset link."}


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(
    body: ResetPasswordRequest, request: Request, db: DbSession, limiter: Limiter
) -> None:
    """Sets the new password and signs the account out everywhere."""
    limiter.hit(rate_limit.RESET_PASSWORD, client_ip(request))
    service.reset_password(db, body.token, body.new_password)
