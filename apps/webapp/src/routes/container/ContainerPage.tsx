import { Card } from '@/components/ui/card';
import { ContainerList } from '@/routes/container/ContainerList';

export const ContainerPage: React.FC = () => {
    return (
        <>
            <h2 className="scroll-m-20 text-3xl font-semibold">Manage Containers</h2>
            <p className="leading-7 text-accent-foreground">
                Create and manage your containers here. You can create, edit, or delete them as you wish.
            </p>

            <Card className="w-full py-2! p-2">
                <ContainerList />
            </Card>
        </>
    );
};
