import { supabase } from '../../lib/supabase';

// Type definition for Inventory Item — Extended for Warehouse Module
export interface InventoryItem {
    id: string;
    name: string;
    sku?: string;
    category: string;
    quantity: number;
    minQuantity: number;
    unit: string;
    description?: string;
    color?: string;
    lengthMm?: number;
    weightKg?: number;
    purchasePrice?: number;
    location?: string;
    imageUrl?: string;
    supplierId?: string;
    supplierName?: string;   // joined from suppliers table
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type NewInventoryItem = Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'supplierName'>;

// Industry-specific categories for aluminum roofing/patio covers
export const WAREHOUSE_CATEGORIES = [
    'Słupy',
    'Profile',
    'Oświetlenie',
    'Akcesoria montażowe',
    'Narzędzia',
    'Odzież robocza',
    'Uszczelki & chemia',
    'Inne',
] as const;

export const COLORS = [
    'Antracyt RAL 7016',
    'Biały RAL 9016',
    'Beżowy',
    'Corten',
    'Szary DB 703',
    'Czarny RAL 9005',
    'Inny',
] as const;

export const InventoryService = {
    // Fetch all inventory items with supplier join
    async getItems(): Promise<InventoryItem[]> {
        const { data, error } = await supabase
            .from('inventory_items')
            .select(`
                *,
                supplier:supplier_id (name)
            `)
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching inventory items:', error);
            throw error;
        }

        return data.map(this.mapToType);
    },

    // Fetch only low-stock items
    async getLowStockItems(): Promise<InventoryItem[]> {
        const { data, error } = await supabase
            .from('inventory_items')
            .select(`*, supplier:supplier_id (name)`)
            .filter('is_active', 'eq', true)
            .order('name');

        if (error) throw error;

        return data
            .map(this.mapToType)
            .filter(item => item.quantity <= item.minQuantity && item.minQuantity > 0);
    },

    // Add a new inventory item
    async addItem(item: Partial<NewInventoryItem>): Promise<InventoryItem> {
        const { data, error } = await supabase
            .from('inventory_items')
            .insert({
                name: item.name,
                sku: item.sku || null,
                category: item.category || 'Inne',
                quantity: item.quantity || 0,
                min_quantity: item.minQuantity || 0,
                unit: item.unit || 'szt',
                description: item.description || null,
                color: item.color || null,
                length_mm: item.lengthMm || null,
                weight_kg: item.weightKg || null,
                purchase_price: item.purchasePrice || null,
                location: item.location || 'Magazyn główny',
                image_url: item.imageUrl || null,
                supplier_id: item.supplierId || null,
                is_active: item.isActive ?? true,
            })
            .select(`*, supplier:supplier_id (name)`)
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

        // 4. Low-stock notification check
        if (changeAmount < 0) {
            const { data: item } = await supabase
                .from('inventory_items')
                .select('name, min_quantity, unit')
                .eq('id', id)
                .single();

            if (item && item.min_quantity > 0 && newQuantity <= item.min_quantity) {
                // Notify all admins + managers
                const { data: managers } = await supabase
                    .from('profiles')
                    .select('id')
                    .in('role', ['admin', 'manager']);

                if (managers && managers.length > 0) {
                    const notifications = managers.map((m: any) => ({
                        user_id: m.id,
                        type: 'inventory_low_stock',
                        title: `⚠️ Niski stan: ${item.name}`,
                        message: `Pozostało ${newQuantity} ${item.unit || 'szt'} (min: ${item.min_quantity})`,
                        link: '/admin/inventory',
                        is_read: false,
                    }));
                    await supabase.from('notifications').insert(notifications);
                }
            }
        }
    },

    // Bulk update quantities (for issuing multiple items to an installation)
    async bulkUpdateQuantity(
        updates: { itemId: string; newQuantity: number; comment?: string }[],
        userId: string,
        operationType: 'usage' | 'return' = 'usage',
        referenceId?: string,
        referenceType?: string
    ): Promise<void> {
        for (const update of updates) {
            await this.updateQuantity(
                update.itemId,
                update.newQuantity,
                userId,
                operationType,
                referenceId,
                referenceType,
                update.comment
            );
        }
    },

    // Get transactions for an item
    async getTransactions(itemId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('inventory_transactions')
            .select('*')
            .eq('inventory_item_id', itemId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) return [];

        // Fetch user names from profiles separately (FK -> auth.users, not profiles)
        const userIds = [...new Set(data.map((t: any) => t.user_id).filter(Boolean))];
        let userMap: Record<string, string> = {};
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);
            if (profiles) {
                profiles.forEach((p: any) => { userMap[p.id] = p.full_name || ''; });
            }
        }

        return data.map((t: any) => ({
            ...t,
            user: { email: userMap[t.user_id] || 'System' }
        }));
    },

    // Update full item details
    async updateItem(id: string, updates: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
        const dbUpdates: Record<string, any> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
        if (updates.category !== undefined) dbUpdates.category = updates.category;
        if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
        if (updates.minQuantity !== undefined) dbUpdates.min_quantity = updates.minQuantity;
        if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.color !== undefined) dbUpdates.color = updates.color;
        if (updates.lengthMm !== undefined) dbUpdates.length_mm = updates.lengthMm;
        if (updates.weightKg !== undefined) dbUpdates.weight_kg = updates.weightKg;
        if (updates.purchasePrice !== undefined) dbUpdates.purchase_price = updates.purchasePrice;
        if (updates.location !== undefined) dbUpdates.location = updates.location;
        if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
        if (updates.supplierId !== undefined) dbUpdates.supplier_id = updates.supplierId;
        if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

        const { error } = await supabase
            .from('inventory_items')
            .update(dbUpdates)
            .eq('id', id);

        if (error) {
            console.error('Error updating inventory item:', error);
            throw error;
        }
    },

    // Delete item (soft delete — set is_active = false)
    async deactivateItem(id: string): Promise<void> {
        const { error } = await supabase
            .from('inventory_items')
            .update({ is_active: false })
            .eq('id', id);

        if (error) {
            console.error('Error deactivating inventory item:', error);
            throw error;
        }
    },

    // Hard delete (only for truly empty items)
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

    // Find item by SKU (for barcode scanning)
    async findBySku(sku: string): Promise<InventoryItem | null> {
        const { data, error } = await supabase
            .from('inventory_items')
            .select(`*, supplier:supplier_id (name)`)
            .eq('sku', sku)
            .eq('is_active', true)
            .maybeSingle();

        if (error) throw error;
        return data ? this.mapToType(data) : null;
    },

    // Helper: Map DB row to Type
    mapToType(row: Record<string, any>): InventoryItem {
        return {
            id: row.id,
            name: row.name,
            sku: row.sku || undefined,
            category: row.category,
            quantity: row.quantity,
            minQuantity: row.min_quantity, // Map snake_case to camelCase
            unit: row.unit,
            description: row.description || undefined,
            color: row.color || undefined,
            lengthMm: row.length_mm || undefined,
            weightKg: row.weight_kg ? Number(row.weight_kg) : undefined,
            purchasePrice: row.purchase_price ? Number(row.purchase_price) : undefined,
            location: row.location || undefined,
            imageUrl: row.image_url || undefined,
            supplierId: row.supplier_id || undefined,
            supplierName: row.supplier?.name || undefined,
            isActive: row.is_active ?? true,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }
};
