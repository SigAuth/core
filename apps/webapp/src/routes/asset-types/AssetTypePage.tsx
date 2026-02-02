import { Card } from '@/components/ui/card';
import { AssetTypeList } from '@/routes/asset-types/AssetTypeList';

export const AssetTypePage: React.FC = () => {
    return (
        <>
            <h2 className="scroll-m-20 text-3xl font-semibold">Manage Asset Types</h2>
            <p className="leading-7 text-accent-foreground">
                Create and manage your blueprints for assets here. You can define variables and
            </p>

            <Card className="w-full py-2! p-2">
                <AssetTypeList />
            </Card>
        </>
    );
};

