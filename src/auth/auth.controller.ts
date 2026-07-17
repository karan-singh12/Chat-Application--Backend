import { Controller, Post, Body } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";

// Apply the strict "auth" throttle tier: 10 requests / minute per IP
// This overrides the global "default" tier for this entire controller
@Throttle({ auth: {} })
@Controller("user/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("signup")
  async signup(@Body() body: any) {
    const signupDto = {
      email: body.email,
      password: body.password,
      username: body.username,
      role: body.role || "USER",
      avatar: body.avatar,
    };
    return this.authService.signup(signupDto);
  }

  @Post("login")
  async login(@Body() body: any) {
    const loginDto = {
      email: body.email,
      password: body.password,
    };
    return this.authService.login(loginDto);
  }
}