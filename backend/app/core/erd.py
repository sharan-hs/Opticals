"""Mermaid ER diagram generated from SQLAlchemy metadata, so docs can't drift."""

from sqlalchemy import Column, MetaData, Table, UniqueConstraint
from sqlalchemy.sql.sqltypes import Enum

GROUPS = {
    "Accounts": ["users", "refresh_tokens", "password_reset_tokens", "addresses"],
    "Catalogue and stock": [
        "categories",
        "brands",
        "products",
        "product_variants",
        "product_images",
        "inventory",
        "inventory_transactions",
    ],
    "Cart, orders and payments": [
        "carts",
        "cart_items",
        "orders",
        "order_items",
        "order_status_history",
        "payments",
        "payment_events",
        "refunds",
    ],
    "Admin": ["audit_logs", "store_settings", "rate_limit_buckets"],
}


def _type_name(column: Column[object]) -> str:
    if isinstance(column.type, Enum):
        return "enum"
    name = column.type.__class__.__name__.lower()
    aliases = {
        "biginteger": "bigint",
        "smallinteger": "smallint",
        "integer": "int",
        "datetime": "timestamptz",
        "string": "varchar",
        "boolean": "bool",
    }
    return aliases.get(name, name)


def _unique_alone(column: Column[object], table: Table) -> bool:
    return any(
        isinstance(c, UniqueConstraint) and len(c.columns) == 1 and column.name in c.columns
        for c in table.constraints
    )


def _markers(column: Column[object], table: Table) -> str:
    keys = []
    if column.primary_key:
        keys.append("PK")
    if column.foreign_keys:
        keys.append("FK")
    if _unique_alone(column, table) and not column.primary_key:
        keys.append("UK")
    return " " + ",".join(keys) if keys else ""


def _relationships(tables: list[Table]) -> list[str]:
    names = {t.name for t in tables}
    lines = []
    for table in tables:
        for fk in sorted(table.foreign_keys, key=lambda f: f.parent.name):
            parent = fk.column.table.name
            if parent not in names:  # drawn in its own section
                continue
            column = fk.parent
            one_to_one = column.primary_key or _unique_alone(column, table)
            left = "|o" if column.nullable else "||"
            right = "o|" if one_to_one else "o{"
            lines.append(f"    {parent} {left}--{right} {table.name} : {column.name}")
    return lines


def render_er_markdown(metadata: MetaData) -> str:
    out = [
        "# Database",
        "",
        "Generated from the SQLAlchemy models by `uv run python -m app.cli er-diagram`;",
        "don't edit by hand. Design notes: `ARCHITECTURE_PLAN.md` §I. Links to tables in",
        "another section appear only as FK columns.",
        "",
        "Conventions: money is integer paise; times are UTC `timestamptz`; `enum` columns are",
        "varchar limited by a CHECK constraint; PK = primary key, FK = foreign key, UK = unique.",
        "",
    ]
    for title, table_names in GROUPS.items():
        tables = [metadata.tables[name] for name in table_names if name in metadata.tables]
        out += [f"## {title}", "", "```mermaid", "erDiagram"]
        out += _relationships(tables)
        for table in tables:
            out.append(f"    {table.name} {{")
            for column in table.columns:
                out.append(f"        {_type_name(column)} {column.name}{_markers(column, table)}")
            out.append("    }")
        out += ["```", ""]
    missing = set(metadata.tables) - {n for names in GROUPS.values() for n in names}
    if missing:
        out += [f"Not grouped yet: {', '.join(sorted(missing))}", ""]
    return "\n".join(out)
