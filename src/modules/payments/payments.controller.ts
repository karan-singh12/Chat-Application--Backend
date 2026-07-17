import { Controller, Post, NotImplementedException } from "@nestjs/common";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  async initiatePayment() {
    throw new NotImplementedException("Payment gateway integration (Stripe/PayPal) is not implemented yet.");
  }
}

