import type { ModuleInfo } from "../../../Utils/types/api.schemas";

type Props = {
    moduleInfo: ModuleInfo;
};

export default function Grades({ moduleInfo }: Props) {
    const calcGradeProgress = () => {
        if (!moduleInfo || moduleInfo.grades.length === 0) return { achieved: 0, remaining: 100 };
        const total = moduleInfo.grades.reduce((sum, g) => sum + g.percentage, 0);
        const achieved = moduleInfo.grades.reduce((sum, g) => sum + g.scored, 0);
        return {
            achieved: (achieved / total) * 100,
            remaining: 100 - (achieved / total) * 100,
        };
    };

    if (!moduleInfo) return <div>Loading...</div>;

    const { achieved, remaining } = calcGradeProgress();

    return (
        <div className="grades">
            <h3>Grades</h3>
            {moduleInfo.grades.map((g) => (
                <div key={g.id} className="grade">
                    <span>
                        {g.name}: {g.scored}/{g.percentage}
                    </span>
                </div>
            ))}
            <div className="grade-bar">
                <div className="achieved" style={{ width: `${achieved}%` }} />
                <div className="remaining" style={{ width: `${remaining}%` }} />
            </div>
        </div>
    );
}
