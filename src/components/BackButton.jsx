import { useNavigate } from 'react-router-dom';

export default function BackButton({ fallback = '/dashboard' }) {
    const navigate = useNavigate();

    function goBack() {
        if (window.history.length > 1) {
            navigate(-1);
            return;
        }

        navigate(fallback);
    }

    return (
        <button
            type="button"
            onClick={goBack}
            className="mb-4 inline-flex items-center rounded-md border border-[#cbd8ca] bg-white px-3 py-2 text-sm font-medium text-[#647260] transition hover:bg-[#fcfdfc]"
        >
            <span aria-hidden="true" className="mr-2">←</span>
            Back
        </button>
    );
}
