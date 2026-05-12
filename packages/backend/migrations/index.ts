import * as migration_20260426_095728 from './20260426_095728'
import * as migration_20260429_140000_cod_collect_and_order_channel from './20260429_140000_cod_collect_and_order_channel'
import * as migration_20260430_120000_add_carts_customer_note from './20260430_120000_add_carts_customer_note'
import * as migration_20260507_120000_order_items_product_slug from './20260507_120000_order_items_product_slug'

export const migrations = [
  {
    up: migration_20260426_095728.up,
    down: migration_20260426_095728.down,
    name: '20260426_095728',
  },
  {
    up: migration_20260429_140000_cod_collect_and_order_channel.up,
    down: migration_20260429_140000_cod_collect_and_order_channel.down,
    name: '20260429_140000_cod_collect_and_order_channel',
  },
  {
    up: migration_20260430_120000_add_carts_customer_note.up,
    down: migration_20260430_120000_add_carts_customer_note.down,
    name: '20260430_120000_add_carts_customer_note',
  },
  {
    up: migration_20260507_120000_order_items_product_slug.up,
    down: migration_20260507_120000_order_items_product_slug.down,
    name: '20260507_120000_order_items_product_slug',
  },
]
