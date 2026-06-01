import * as migration_20260426_095728 from './20260426_095728';
import * as migration_20260429_140000_cod_collect_and_order_channel from './20260429_140000_cod_collect_and_order_channel';
import * as migration_20260430_120000_add_carts_customer_note from './20260430_120000_add_carts_customer_note';
import * as migration_20260507_120000_order_items_product_slug from './20260507_120000_order_items_product_slug';
import * as migration_20260513_142155_add_bundle_product_type from './20260513_142155_add_bundle_product_type';
import * as migration_20260514_171500_products_sku_optional_unique from './20260514_171500_products_sku_optional_unique';
import * as migration_20260515_120000_addresses_geo_affinity from './20260515_120000_addresses_geo_affinity';
import * as migration_20260601_141500_wishlist_items from './20260601_141500_wishlist_items';
import * as migration_20260601_153000_add_wishlist_locked_rels from './20260601_153000_add_wishlist_locked_rels';

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
  {
    up: migration_20260513_142155_add_bundle_product_type.up,
    down: migration_20260513_142155_add_bundle_product_type.down,
    name: '20260513_142155_add_bundle_product_type'
  },
  {
    up: migration_20260514_171500_products_sku_optional_unique.up,
    down: migration_20260514_171500_products_sku_optional_unique.down,
    name: '20260514_171500_products_sku_optional_unique',
  },
  {
    up: migration_20260515_120000_addresses_geo_affinity.up,
    down: migration_20260515_120000_addresses_geo_affinity.down,
    name: '20260515_120000_addresses_geo_affinity',
  },
  {
    up: migration_20260601_141500_wishlist_items.up,
    down: migration_20260601_141500_wishlist_items.down,
    name: '20260601_141500_wishlist_items',
  },
  {
    up: migration_20260601_153000_add_wishlist_locked_rels.up,
    down: migration_20260601_153000_add_wishlist_locked_rels.down,
    name: '20260601_153000_add_wishlist_locked_rels',
  },
];
