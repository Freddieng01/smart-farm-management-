import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ProtectedRoute from '../components/ProtectedRoute.jsx';

export default function UserManagement() {
    const { api, hasRole } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Worker',
    });
    const [submitting, setSubmitting] = useState(false);

    const ROLES = ['Admin', 'Manager', 'Agronomist', 'Worker'];

    useEffect(() => {
        fetchUsers();
    }, []);

    async function fetchUsers() {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get('/users');
            setUsers(response.data.data || response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }

    function handleInputChange(e) {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    }

    async function handleAddUser(e) {
        e.preventDefault();
        setSubmitting(true);

        try {
            await api.post('/users', formData);
            setFormData({ name: '', email: '', password: '', role: 'Worker' });
            setShowModal(false);
            await fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add user');
        } finally {
            setSubmitting(false);
        }
    }

    if (!hasRole('Admin')) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="text-center">
                    <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-600">You do not have permission to access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <ProtectedRoute allowedRoles="Admin">
            <main className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                            <p className="text-gray-600 mt-1">Manage system users and assign roles</p>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="bg-[#315f2b] text-white px-4 py-2 rounded-md font-medium hover:bg-[#264b22] transition"
                        >
                            + Add User
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <p className="text-gray-600">Loading users...</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg shadow overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-100 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                                No users found
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map(user => (
                                            <tr key={user.id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 text-sm text-gray-900">{user.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        user.role === 'Admin' ? 'bg-red-100 text-red-800' :
                                                        user.role === 'Manager' ? 'bg-blue-100 text-blue-800' :
                                                        user.role === 'Agronomist' ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {showModal && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-lg max-w-md w-full p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Add New User</h2>
                                <form onSubmit={handleAddUser} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#315f2b]"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#315f2b]"
                                            placeholder="john@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#315f2b]"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                        <select
                                            name="role"
                                            value={formData.role}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#315f2b]"
                                        >
                                            {ROLES.map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 bg-[#315f2b] text-white px-4 py-2 rounded-md font-medium hover:bg-[#264b22] transition disabled:opacity-60"
                                        >
                                            {submitting ? 'Adding...' : 'Add User'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowModal(false)}
                                            className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-md font-medium hover:bg-gray-300 transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </ProtectedRoute>
    );
}
