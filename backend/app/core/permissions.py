"""What each role may do. Adding STAFF/MANAGER later: extend UserRole (with a
migration for its CHECK constraint) and add an entry here."""

from enum import StrEnum

from app.models.enums import UserRole


class Permission(StrEnum):
    CATALOG_WRITE = "catalog:write"
    INVENTORY_WRITE = "inventory:write"
    ORDERS_READ = "orders:read"
    ORDERS_WRITE = "orders:write"
    CUSTOMERS_READ = "customers:read"
    REPORTS_READ = "reports:read"
    SETTINGS_WRITE = "settings:write"


ROLE_PERMISSIONS: dict[UserRole, frozenset[Permission]] = {
    UserRole.CUSTOMER: frozenset(),
    UserRole.ADMIN: frozenset(Permission),
}


def has_permission(role: UserRole, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, frozenset())
