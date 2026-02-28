import { SigAuthSDK } from '@/lib/pre-sigauth/generated/sigauth.sdk';

export async function getAccountsAction() {
    const result = await SigAuthSDK.getInstance().Account.find({ internalAuthorization: true });
    console.log(result);
    return result;
}
