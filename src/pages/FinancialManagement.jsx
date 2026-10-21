import { Link } from 'react-router-dom';
import ModuleShell from '../components/ModuleShell.jsx';

export default function FinancialManagement() {
    return (
        <ModuleShell title="Financial Management" description="Income, budgets, profit/loss and cost analysis.">
            <p className="text-sm text-[#647260]">Module scaffold. Income, budgets and profit/loss will be built here.</p>
            <p className="mt-3 text-sm">
                Expenses are already handled on the <Link className="text-[#4d7a39] underline" to="/expenses">Expense Tracking</Link> page.
            </p>
        </ModuleShell>
    );
}