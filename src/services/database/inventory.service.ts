import { supabase } from '../../lib/supabase';

// Type definition for Inventory Item
export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    minQuantity: number;
    unit: string;
    description?: string;
    createdAt: Date;
    updatedAt: Date;
}

export const InventoryService = {
    // Fetch all inventory items
    async getItems(): Promise<InventoryItem[]> {
        const { data, error } = await supabase
            .from('inventory_items')
            .select('*')
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching inventory items:', error);
            throw error;
        }

        return data.map(this.mapToType);
    },

    // Add a new inventory item
    async addItem(item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<InventoryItem> {
        const { data, error } = await supabase
            .from('inventory_items')
            .insert({
                name: item.name,
                category: item.category,
                quantity: item.quantity,
                min_quantity: item.minQuantity,
                unit: item.unit,
                description: item.description
            })
            .select()
            .single();

        if (error) {
            console.error('Error adding inventory item:', error);
            throw error;
        }

        return this.mapToType(data);
    },

    // Update quantity (restocking or usage) with transaction log
    async updateQuantity(
        id: string,
        newQuantity: number,
        userId: string | undefined,
        operationType: 'adjustment' | 'purchase' | 'usage' | 'return' = 'adjustment',
        referenceId?: string,
        referenceType?: string,
        comment?: string
    ): Promise<void> {
        // 1. Get current item to calculate change
        const { data: currentItem, error: fetchError } = await supabase
            .from('inventory_items')
            .select('quantity')
            .eq('id', id)
            .single();

        if (fetchError || !currentItem) throw fetchError || new Error('Item not found');

        const changeAmount = newQuantity - currentItem.quantity;
        if (changeAmount === 0) return; // No change

        // 2. Perform Update
        const { error: updateError } = await supabase
            .from('inventory_items')
            .update({ quantity: newQuantity })
            .eq('id', id);

        if (updateError) {
            console.error('Error updating quantity:', updateError);
            throw updateError;
        }

        // 3. Log Transaction
        if (userId) { // Only log if we have a user (should always enforce in UI)
            await supabase.from('inventory_transactions').insert({
                inventory_item_id: id,
                user_id: userId,
                change_amount: changeAmount,
                new_quantity: newQuantity,
                operation_type: operationType,
                reference_id: referenceId,
                reference_type: referenceType,
                comment: comment
            });
        }
    },

    // Get transactions for an item
    async getTransactions(itemId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('inventory_transactions')
            .select(`
                *,
                user:user_id (
                    email
                )
            `) // Note: profile/user relations might differ based on auth schema, simplified for now
            .eq('inventory_item_id', itemId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Map user email if possible, or just return raw
        return data || [];
    },

    // Update full item details
    async updateItem(id: string, updates: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
        const dbUpdates: Record<string, any> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.minQuantity !== undefined) dbUpdates.min_quantity = updates.minQuantity;
        if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
        if (updates.description !== undefined) dbUpdates.description = updates.description;

        const { error } = await supabase
            .from('inventory_items')
            .update(dbUpdates)
            .eq('id', id);

        if (error) {
            console.error('Error updating inventory item:', error);
            throw error;
        }
    },

    // Delete item
    async deleteItem(id: string): Promise<void> {
        const { error } = await supabase
            .from('inventory_items')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting inventory item:', error);
            throw error;
        }
    },

    // Helper: Map DB row to Type
    mapToType(row: Record<string, any>): InventoryItem {
        return {
            id: row.id,
            name: row.name,
            category: row.category,
            quantity: row.quantity,
            minQuantity: row.min_quantity, // Map snake_case to camelCase
            unit: row.unit,
            description: row.description,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
};
