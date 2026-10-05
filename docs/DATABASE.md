# Database

Generated from the SQLAlchemy models by `uv run python -m app.cli er-diagram`;
don't edit by hand. Design notes: `ARCHITECTURE_PLAN.md` §I. Links to tables in
another section appear only as FK columns.

Conventions: money is integer paise; times are UTC `timestamptz`; `enum` columns are
varchar limited by a CHECK constraint; PK = primary key, FK = foreign key, UK = unique.

## Accounts

```mermaid
erDiagram
    refresh_tokens |o--o{ refresh_tokens : replaced_by_id
    users ||--o{ refresh_tokens : user_id
    users ||--o{ password_reset_tokens : user_id
    users ||--o{ addresses : user_id
    users {
        bigint id PK
        citext email UK
        text password_hash
        varchar full_name
        varchar phone
        enum role
        bool is_active
        timestamptz email_verified_at
        timestamptz last_login_at
        timestamptz updated_at
        timestamptz created_at
        timestamptz deleted_at
    }
    refresh_tokens {
        bigint id PK
        bigint user_id FK
        varchar token_hash UK
        uuid family_id
        timestamptz expires_at
        timestamptz revoked_at
        bigint replaced_by_id FK
        text user_agent
        inet ip
        timestamptz created_at
    }
    password_reset_tokens {
        bigint id PK
        bigint user_id FK
        varchar token_hash UK
        timestamptz expires_at
        timestamptz used_at
        timestamptz created_at
    }
    addresses {
        bigint id PK
        bigint user_id FK
        varchar label
        varchar full_name
        varchar phone
        varchar line1
        varchar line2
        varchar landmark
        varchar city
        varchar state
        varchar pincode
        varchar country
        bool is_default
        timestamptz updated_at
        timestamptz created_at
        timestamptz deleted_at
    }
```

## Catalogue and stock

```mermaid
erDiagram
    categories |o--o{ categories : parent_id
    brands ||--o{ products : brand_id
    categories ||--o{ products : category_id
    products ||--o{ product_variants : product_id
    products ||--o{ product_images : product_id
    product_variants |o--o{ product_images : variant_id
    product_variants ||--o| inventory : variant_id
    product_variants ||--o{ inventory_transactions : variant_id
    categories {
        bigint id PK
        bigint parent_id FK
        varchar name
        varchar slug UK
        text description
        varchar image_public_id
        smallint sort_order
        bool is_active
        timestamptz updated_at
        timestamptz created_at
    }
    brands {
        bigint id PK
        citext name UK
        varchar slug UK
        varchar logo_public_id
        bool is_active
        timestamptz updated_at
        timestamptz created_at
    }
    products {
        bigint id PK
        varchar name
        varchar slug UK
        bigint brand_id FK
        bigint category_id FK
        enum gender
        enum frame_type
        enum frame_shape
        enum frame_material
        varchar model_number
        text description
        jsonb specifications
        varchar hsn_code
        enum status
        bool is_featured
        tsvector search_vector
        bigint created_by FK
        bigint updated_by FK
        timestamptz updated_at
        timestamptz created_at
        timestamptz deleted_at
    }
    product_variants {
        bigint id PK
        bigint product_id FK
        varchar sku
        varchar color_name
        enum color_family
        varchar color_hex
        varchar size_label
        smallint lens_width_mm
        smallint bridge_mm
        smallint temple_mm
        bigint mrp_paise
        bigint price_paise
        int weight_grams
        bool is_active
        smallint sort_order
        timestamptz updated_at
        timestamptz created_at
        timestamptz deleted_at
    }
    product_images {
        bigint id PK
        bigint product_id FK
        bigint variant_id FK
        varchar public_id UK
        bigint version
        varchar format
        int width
        int height
        int bytes
        varchar alt_text
        smallint sort_order
        bool is_primary
        timestamptz created_at
    }
    inventory {
        bigint variant_id PK,FK
        int on_hand
        int reserved
        int low_stock_threshold
        timestamptz updated_at
    }
    inventory_transactions {
        bigint id PK
        bigint variant_id FK
        enum type
        int quantity_delta
        int on_hand_after
        bigint order_id FK
        text note
        bigint created_by FK
        timestamptz created_at
    }
```

## Cart, orders and payments

```mermaid
erDiagram
    carts ||--o{ cart_items : cart_id
    orders ||--o{ order_items : order_id
    orders ||--o{ order_status_history : order_id
    orders ||--o{ payments : order_id
    payments ||--o{ refunds : payment_id
    carts {
        bigint id PK
        bigint user_id FK,UK
        timestamptz updated_at
        timestamptz created_at
    }
    cart_items {
        bigint id PK
        bigint cart_id FK
        bigint variant_id FK
        int quantity
        timestamptz updated_at
        timestamptz created_at
    }
    orders {
        bigint id PK
        varchar order_number UK
        bigint user_id FK
        enum status
        enum payment_status
        enum payment_method
        enum fulfilment
        varchar currency
        bigint subtotal_paise
        bigint discount_paise
        bigint shipping_paise
        bigint tax_paise
        bigint total_paise
        varchar coupon_code
        jsonb shipping_address
        jsonb pickup_store
        varchar contact_email
        varchar contact_phone
        text customer_note
        varchar courier_name
        varchar tracking_number
        varchar tracking_url
        timestamptz expires_at
        timestamptz placed_at
        timestamptz paid_at
        timestamptz shipped_at
        timestamptz delivered_at
        timestamptz cancelled_at
        text cancel_reason
        uuid idempotency_key
        timestamptz updated_at
        timestamptz created_at
    }
    order_items {
        bigint id PK
        bigint order_id FK
        bigint variant_id FK
        varchar product_name
        varchar variant_label
        varchar sku
        varchar image_public_id
        bigint unit_mrp_paise
        bigint unit_price_paise
        int quantity
        bigint line_total_paise
        smallint gst_rate_bp
        jsonb configuration
        timestamptz created_at
    }
    order_status_history {
        bigint id PK
        bigint order_id FK
        enum from_status
        enum to_status
        text note
        bigint changed_by FK
        timestamptz created_at
    }
    payments {
        bigint id PK
        bigint order_id FK
        enum provider
        varchar provider_order_id UK
        varchar provider_payment_id UK
        bigint amount_paise
        varchar currency
        enum status
        varchar method
        varchar error_code
        text error_description
        jsonb raw
        timestamptz updated_at
        timestamptz created_at
    }
    payment_events {
        bigint id PK
        enum provider
        varchar event_id UK
        varchar event_type
        jsonb payload
        bool signature_valid
        timestamptz processed_at
        text error
        timestamptz created_at
    }
    refunds {
        bigint id PK
        bigint payment_id FK
        varchar provider_refund_id UK
        bigint amount_paise
        enum status
        text reason
        bigint created_by FK
        timestamptz updated_at
        timestamptz created_at
    }
```

## Admin

```mermaid
erDiagram
    audit_logs {
        bigint id PK
        bigint actor_id FK
        varchar action
        varchar entity_type
        varchar entity_id
        jsonb changes
        inet ip
        timestamptz created_at
    }
    store_settings {
        varchar key PK
        jsonb value
        bigint updated_by FK
        timestamptz updated_at
    }
    rate_limit_buckets {
        varchar key PK
        timestamptz window_start
        int count
    }
```
