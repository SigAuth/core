'use server';

import AccountsList from '@/app/accounts/AccountList';
import { Card } from '@/components/ui/card';
import { SigAuthNextWrapper } from '@/lib/pre-sigauth/generated/next/sigauth.nextjs';
import { SigAuthSDK } from '@/lib/pre-sigauth/generated/sigauth.sdk';

const AccountsPage = async () => {
    const headers = await SigAuthNextWrapper.getHeaderRecord();
    const accounts = await SigAuthSDK.getInstance().Account.find({
        where: {},
        internalAuthorization: true,
        accessToken: headers['x-sigauth-access-token'] as string,
    });
    console.log(accounts);

    return (
        <>
            <h2 className="scroll-m-20 text-3xl font-semibold">Manage Accounts</h2>
            <p className="leading-7 text-accent-foreground">
                Create and manage your accounts here. You can create, edit, grant or delete them as you wish.
            </p>

            <Card className="w-full py-2! p-2">
                <AccountsList accounts={accounts} />
            </Card>
        </>
    );
};

export default AccountsPage;

