import FakePE from 'fakepe-sdk'
import { NextResponse } from 'next/server'

const isMockGateway =
  !process.env.RAZORPAY_KEY_ID ||
  process.env.RAZORPAY_KEY_ID === 'dummy_key_id' ||
  !process.env.RAZORPAY_KEY_SECRET ||
  process.env.RAZORPAY_KEY_SECRET === 'dummy_key_secret'

let fakepe = null

if (!isMockGateway) {
  fakepe = new FakePE({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
    baseUrl: process.env.FAKEPE_BASE_URL || 'http://localhost:4000',
  })
}

export async function POST(request) {
  try {
    const { amount } = await request.json()

    if (isMockGateway) {
      return NextResponse.json({
        orderId: `mock_order_${Date.now()}`,
        paymentId: `mock_payment_${Date.now()}`,
        mock: true,
        amount: Number(amount) || 0,
      })
    }

    const payment = await fakepe.payments.create({
      merchantId: 'hexbridge_merchant',
      amount: Number(amount) * 100,
      orderId: `order_${Date.now()}`,
      callbackUrl: 'http://localhost:3000/dashboard/browse',
    })

    return NextResponse.json({
      orderId: payment.paymentId,
      paymentUrl: payment.paymentUrl,
      mock: false,
    })
  } catch (error) {
    console.error('FakePE error:', error)
    return NextResponse.json({
      orderId: `mock_order_${Date.now()}`,
      paymentId: `mock_payment_${Date.now()}`,
      mock: true,
      amount: 0,
    })
  }
}