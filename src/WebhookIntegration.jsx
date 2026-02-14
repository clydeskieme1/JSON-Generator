import React, { useState } from 'react';
import { Users, X } from 'lucide-react';

export default function WebhookIntegration({ resultJson, onClose }) {
    const [selectedSheet, setSelectedSheet] = useState('1');
    const [cookie, setCookie] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusDialog, setStatusDialog] = useState(null);

    const sheets = [
        { value: '1', label: 'Sheet 1' },
        { value: '2', label: 'Sheet 2' },
        { value: '3', label: 'Sheet 3' },
        { value: '4', label: 'Sheet 4' },
        { value: '5', label: 'Sheet 5' },
        { value: '6', label: 'Sheet 6' },
        { value: '7', label: 'Sheet 7' },
        { value: '8', label: 'Sheet 8' },
        { value: '9', label: 'Sheet 9' },
        { value: '10', label: 'Sheet 10' },
        { value: 'am', label: 'Sheet 1 AM Cookie' },
    ];

    const getWebhookUrl = () => {
        if (selectedSheet === 'am') {
            return 'https://n8n.sendingworks.info/webhook/sheet2-am';
        }
        return `https://n8n.sendingworks.info/webhook/sheet2-${selectedSheet}`;
    };

    const handleAddUsers = async () => {
        if (!cookie.trim()) {
            setStatusDialog({
                type: 'error',
                title: 'Missing Cookie',
                message: 'Please paste the Microsoft cookie before adding users.',
            });
            return;
        }

        if (!resultJson) {
            setStatusDialog({
                type: 'error',
                title: 'No JSON Data',
                message: 'Please generate JSON data first before adding users.',
            });
            return;
        }

        setLoading(true);

        try {
            const payload = {
                ...resultJson,
                cookie: cookie.trim(),
                sheet: selectedSheet === 'am' ? 'Sheet 1 AM Cookie' : `Sheet ${selectedSheet}`,
                timestamp: new Date().toISOString(),
            };

            const response = await fetch(getWebhookUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setStatusDialog({
                    type: 'success',
                    title: 'Success',
                    message: `Users added successfully to ${selectedSheet === 'am' ? 'Sheet 1 AM Cookie' : `Sheet ${selectedSheet}`}. Webhook triggered!`,
                });
                // Clear cookie after successful submission
                setCookie('');
            } else {
                const errorData = await response.text();
                setStatusDialog({
                    type: 'error',
                    title: 'Webhook Error',
                    message: `Failed to trigger webhook. Status: ${response.status}\n${errorData || 'Unknown error'}`,
                });
            }
        } catch (error) {
            setStatusDialog({
                type: 'error',
                title: 'Error',
                message: `Failed to add users: ${error.message}`,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Main Integration Panel */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-indigo-100 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-blue-800 flex items-center">
                        <span className="mr-2"></span>
                        Webhook & User Management
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Sheet Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Target Sheet
                        </label>
                        <select
                            value={selectedSheet}
                            onChange={(e) => setSelectedSheet(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        >
                            {sheets.map((sheet) => (
                                <option key={sheet.value} value={sheet.value}>
                                    {sheet.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Choose which sheet the users will be added to
                        </p>
                    </div>

                    {/* Cookie Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Microsoft Cookie <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={cookie}
                            onChange={(e) => setCookie(e.target.value)}
                            placeholder="Paste your Microsoft authentication cookie here..."
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Your cookie is required for authentication with Microsoft services
                        </p>
                    </div>

                    {/* Status Info */}
                    {resultJson && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-800">
                                <span className="font-semibold">Ready to add:</span> {resultJson.sharedmailbox?.length || 0} email addresses
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                Domain: <code className="bg-blue-100 px-2 py-1 rounded">{resultJson.domain}</code>
                            </p>
                        </div>
                    )}

                    {/* Add Users Button */}
                    <button
                        onClick={handleAddUsers}
                        disabled={loading || !resultJson}
                        className={`w-full px-4 py-3 rounded-lg font-medium transition-all duration-300 transform ${loading || !resultJson
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:scale-105'
                            }`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="inline-block animate-spin">⏳</span>
                                Adding users...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <Users className='w-5 h-5 text-white' />
                                Add Users via Webhook
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Status Dialog */}
            {statusDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in">
                        <div className="flex items-start gap-4">
                            <div className="text-3xl">
                                {statusDialog.type === 'success' ? '✅' : '❌'}
                            </div>
                            <div className="flex-1">
                                <h3 className={`text-lg font-semibold mb-2 ${statusDialog.type === 'success' ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                    {statusDialog.title}
                                </h3>
                                <p className={`text-sm whitespace-pre-wrap ${statusDialog.type === 'success' ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                    {statusDialog.message}
                                </p>
                            </div>
                            <button
                                onClick={() => setStatusDialog(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mt-6 flex gap-2">
                            <button
                                onClick={() => setStatusDialog(null)}
                                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${statusDialog.type === 'success'
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                    }`}
                            >
                                {statusDialog.type === 'success' ? 'Done' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
