
//Define an interface for the sign in form 
export interface ISignInForm {
    name: string;
    password: string;
    rememberMe?: boolean;
};
//Define an interface for the sign up form 
export type ISignUpForm = {
    name: string;
    email:string;
    password: string;
    rememberMe?: boolean;
};
//Define an interface for the forgot
export interface IForgotForm  {
    email: string;
};
//Define an interface for the reset password form 
export interface IResetPasswordForm  {
    password: string;
    password2: string;
};