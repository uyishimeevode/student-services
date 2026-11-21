import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import { z } from 'zod';
import { AccessPolicy } from '../common/access.policy.js';
import type { AuthUser } from '../common/auth-user.js';
import {
  createInvoiceSchema,
  listInvoicesSchema,
  listPaymentsSchema,
  reviewPaymentSchema,
  submitPaymentSchema,
  waiverSchema,
  type CreateInvoice,
  type ListInvoices,
  type ListPayments,
  type ReviewPayment,
  type SubmitPayment,
  type Waiver,
} from './finance.schemas.js';
import { FinanceService } from './finance.service.js';

const idSchema = z.uuid();

@Controller('finance')
@Can(AccessPolicy, 'manageFinance')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('invoices')
  invoices(@Query({ schema: listInvoicesSchema }) query: ListInvoices) {
    return this.finance.listInvoices(query);
  }

  @Post('invoices')
  createInvoices(
    @CurrentUser() actor: AuthUser,
    @Body({ schema: createInvoiceSchema }) body: CreateInvoice,
  ) {
    return this.finance.createInvoices(actor, body);
  }

  @Patch('invoices/:id/waiver')
  waiver(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: waiverSchema }) body: Waiver,
  ) {
    return this.finance.applyWaiver(actor, id, body);
  }

  @Get('payments')
  payments(@Query({ schema: listPaymentsSchema }) query: ListPayments) {
    return this.finance.listPayments(query);
  }

  @Patch('payments/:id')
  review(
    @CurrentUser() actor: AuthUser,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: reviewPaymentSchema }) body: ReviewPayment,
  ) {
    return this.finance.reviewPayment(actor, id, body);
  }

  @Get('report')
  report() {
    return this.finance.report();
  }
}

@Controller('my/fees')
@Can(AccessPolicy, 'payFees')
export class MyFeesController {
  constructor(private readonly finance: FinanceService) {}

  @Get()
  fees(@CurrentUser() actor: AuthUser) {
    return this.finance.myFees(actor);
  }

  @Post(':invoiceId/payments')
  pay(
    @CurrentUser() actor: AuthUser,
    @Param('invoiceId', { schema: idSchema }) id: string,
    @Body({ schema: submitPaymentSchema }) body: SubmitPayment,
  ) {
    return this.finance.submitPayment(actor, id, body);
  }
}
