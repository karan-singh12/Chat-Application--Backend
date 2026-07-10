export class SignupDto {
  email: string;
  password?: string;
  username?: string;
  role?: "USER" | "ADMIN";
}
