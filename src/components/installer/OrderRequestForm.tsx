import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { DatabaseService } from '../../services/database';
import { useTranslation } from '../../contexts/TranslationContext';

interface OrderRequestFormProps {
    onSuccess?: () => void;
}

export const OrderRequestForm: React.FC<OrderRequestFormProps> = ({ onSuccess }) => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setLoading(true);
        try {
            const { error } = await DatabaseService.createOrderRequest({
                userId: currentUser.id,
                itemName: itemName,
                quantity,
                description,
                status: 'pending'
            });

            if (error) throw error;

            toast.success(t('requests.successMessage'));
            setItemName('');
            setQuantity(1);
            setDescription('');
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error creating order request:', error);
            toast.error(t('requests.errorMessage'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('requests.formTitle')}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="itemName" className="block text-sm font-medium text-slate-700 mb-1">
                        {t('requests.itemName')} *
                    </label>
                    <input
                        type="text"
                        id="itemName"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={t('requests.itemPlaceholder')}
                    />
                </div>

                <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 mb-1">
                        {t('requests.quantity')} *
                    </label>
                    <input
                        type="number"
                        id="quantity"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                        {t('requests.description')}
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={t('requests.descriptionPlaceholder')}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('requests.submitting')}
                        </span>
                    ) : (
                        t('requests.submit')
                    )}
                </button>
            </form>
        </div>
    );
};
