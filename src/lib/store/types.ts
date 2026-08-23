import type { DraftOrder, Order, Party, Product, ProductPack, ProductType } from "@/types";

export interface DataStore {
  // Products
  listProducts(): Promise<Product[]>;
  createProduct(input: { name: string; type: ProductType; packs: ProductPack[]; active?: boolean }): Promise<Product>;
  updateProduct(
    id: string,
    patch: Partial<Pick<Product, "name" | "type" | "packs" | "active">>
  ): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Parties
  listParties(): Promise<Party[]>;
  createParty(input: Omit<Party, "id" | "created_at">): Promise<Party>;
  updateParty(id: string, patch: Partial<Omit<Party, "id" | "created_at">>): Promise<Party>;
  deleteParty(id: string): Promise<void>;

  // Orders
  listOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  createOrder(draft: DraftOrder): Promise<Order>;
  updateOrder(id: string, draft: DraftOrder): Promise<Order>;
  deleteOrder(id: string): Promise<void>;
  duplicateOrder(id: string): Promise<Order>;
}
