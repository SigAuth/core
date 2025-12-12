import { Card } from '@/components/ui/card';
import { AccountsList } from '@/routes/accounts/AccountList';

export const AccountsPage: React.FC = () => {
    return (
        <>
            <h2 className="scroll-m-20 text-3xl font-semibold">Manage Accounts</h2>
            <p className="leading-7 text-accent-foreground">
                Create and manage your accounts here. You can create, edit, grant or delete them as you wish.
            </p>

            <Card className="w-full py-2! p-2">
                <AccountsList />
            </Card>
        </>
    );
};
