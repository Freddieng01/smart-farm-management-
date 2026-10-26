import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ModuleLayout from '../components/ModuleLayout.jsx';
import {
    Alert,
    Badge,
    Button,
    Card,
    Field,
    Modal,
    RowAction,
    TableMessage,
    inputClass,
    tdClass,
    thClass,
} from '../components/ModuleUI.jsx';

const emptyForm = {
    farm_id: '',
    tag_number: '',
    species: '',
    breed: '',
    sex: 'Male',
    birth_date: '',
    status: 'Active',
    current_weight_kg: '',
};

function statusTone(status) {
    if (status === 'Active') return 'green';
    if (status === 'Sold') return 'blue';
    return 'gray';
}

export default function LivestockManagement() {
    const { api } = useAuth();
    const [livestock, setLivestock] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAnimal, setEditingAnimal] = useState(null);
    const [form, setForm] = useState(emptyForm);

    useEffect(() => {
        fetchLivestock();
    }, []);

    async function fetchLivestock() {
        setLoading(true);
        try {
            const response = await api.get('/api/livestock');
            setLivestock(response.data.data ?? response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch livestock records.');
        } finally {
            setLoading(false);
        }
    }

    function handleOpenModal(animal = null) {
        if (animal) {
            setEditingAnimal(animal);
            setForm({
                farm_id: animal.farm_id,
                tag_number: animal.tag_number,
                species: animal.species,
                breed: animal.breed || '',
                sex: animal.sex,
                birth_date: animal.birth_date || '',
                status: animal.status,
                current_weight_kg: animal.current_weight_kg || '',
            });
        } else {
            setEditingAnimal(null);
            setForm(emptyForm);
        }
        setIsModalOpen(true);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (editingAnimal) {
                await api.put(`/api/livestock/${editingAnimal.id}`, form);
            } else {
                await api.post('/api/livestock', form);
            }
            setIsModalOpen(false);
            fetchLivestock();
        } catch (err) {
            alert(err.response?.data?.message || 'An error occurred while saving the animal.');
        }
    }

    async function handleDelete(id) {
        if (window.confirm('Are you sure you want to delete this animal record? This will also remove its vaccination, health, and breeding history.')) {
            try {
                await api.delete(`/api/livestock/${id}`);
                fetchLivestock();
            } catch (err) {
                alert('Failed to delete livestock record.');
            }
        }
    }

    return (
        <ModuleLayout
            title="Livestock"
            subtitle="Register animals and keep track of their vaccinations, health and breeding."
            actions={
                <Button variant="accent" onClick={() => handleOpenModal()}>
                    Add animal
                </Button>
            }
        >
            {error && <Alert>{error}</Alert>}

            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-farm-100 bg-farm-50">
                            <tr>
                                <th className={thClass}>Tag number</th>
                                <th className={thClass}>Species</th>
                                <th className={thClass}>Breed</th>
                                <th className={thClass}>Sex</th>
                                <th className={thClass}>Status</th>
                                <th className={thClass}>Weight (kg)</th>
                                <th className={`${thClass} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-farm-100">
                            {loading ? (
                                <TableMessage colSpan={7}>Loading livestock...</TableMessage>
                            ) : livestock.length === 0 ? (
                                <TableMessage colSpan={7}>
                                    No animals yet. Select "Add animal" to register your first one.
                                </TableMessage>
                            ) : (
                                livestock.map((animal) => (
                                    <tr key={animal.id} className="transition hover:bg-farm-50">
                                        <td className="px-5 py-4 font-medium text-farm-900">{animal.tag_number}</td>
                                        <td className={tdClass}>{animal.species}</td>
                                        <td className={tdClass}>{animal.breed || 'Not set'}</td>
                                        <td className={tdClass}>{animal.sex}</td>
                                        <td className="px-5 py-4">
                                            <Badge tone={statusTone(animal.status)}>{animal.status}</Badge>
                                        </td>
                                        <td className={tdClass}>{animal.current_weight_kg || '—'}</td>
                                        <td className="space-x-3 px-5 py-4 text-right">
                                            <RowAction onClick={() => handleOpenModal(animal)}>Edit</RowAction>
                                            <RowAction tone="danger" onClick={() => handleDelete(animal.id)}>
                                                Delete
                                            </RowAction>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {isModalOpen && (
                <Modal
                    title={editingAnimal ? 'Edit animal' : 'Register new animal'}
                    onClose={() => setIsModalOpen(false)}
                >
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Field label="Farm ID">
                            <input
                                type="number"
                                className={inputClass}
                                value={form.farm_id}
                                onChange={(e) => setForm({ ...form, farm_id: e.target.value })}
                                required
                            />
                        </Field>
                        <Field label="Tag number">
                            <input
                                className={inputClass}
                                value={form.tag_number}
                                onChange={(e) => setForm({ ...form, tag_number: e.target.value })}
                                required
                            />
                        </Field>
                        <Field label="Species">
                            <input
                                className={inputClass}
                                placeholder="e.g. Cattle, Goat, Poultry"
                                value={form.species}
                                onChange={(e) => setForm({ ...form, species: e.target.value })}
                                required
                            />
                        </Field>
                        <Field label="Breed">
                            <input
                                className={inputClass}
                                value={form.breed}
                                onChange={(e) => setForm({ ...form, breed: e.target.value })}
                            />
                        </Field>
                        <Field label="Sex">
                            <select
                                className={inputClass}
                                value={form.sex}
                                onChange={(e) => setForm({ ...form, sex: e.target.value })}
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                            </select>
                        </Field>
                        <Field label="Birth date">
                            <input
                                type="date"
                                className={inputClass}
                                value={form.birth_date}
                                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                            />
                        </Field>
                        <Field label="Status">
                            <select
                                className={inputClass}
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                            >
                                <option value="Active">Active</option>
                                <option value="Sold">Sold</option>
                                <option value="Deceased">Deceased</option>
                            </select>
                        </Field>
                        <Field label="Current weight (kg)">
                            <input
                                type="number"
                                step="0.01"
                                className={inputClass}
                                value={form.current_weight_kg}
                                onChange={(e) => setForm({ ...form, current_weight_kg: e.target.value })}
                            />
                        </Field>

                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">
                                {editingAnimal ? 'Save changes' : 'Register animal'}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </ModuleLayout>
    );
}
