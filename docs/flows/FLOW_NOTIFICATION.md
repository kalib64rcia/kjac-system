# FLOW_NOTIFICATION.md

**Klein & Justin Airconditioning - Notification System Workflows**

**Document Version:** 1.0  
**Last Updated:** September 10, 2026  
**Author:** KJAC Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Notification Architecture](#notification-architecture)
3. [Admin Notifications](#admin-notifications)
4. [Customer Notifications](#customer-notifications)
5. [Technician Notifications](#technician-notifications)
6. [Email Notifications](#email-notifications)
7. [Push Notifications](#push-notifications)
8. [In-App Notifications](#in-app-notifications)
9. [Notification Preferences](#notification-preferences)
10. [Notification Delivery Logic](#notification-delivery-logic)
11. [Templates & Content](#templates--content)

---

## Overview

### Purpose
This document defines the complete notification system for the KJAC platform, covering push notifications, email notifications, in-app notifications, and the logic for when and how they are triggered.

### Notification Channels
- **Push Notifications** - Mobile app (Firebase Cloud Messaging)
- **Email Notifications** - SMTP service (SendGrid/AWS SES)
- **In-App Notifications** - Real-time via WebSocket
- **SMS Notifications** - Future feature (Twilio)

### Notification Types
- **Transactional** - Booking confirmations, status updates (high priority)
- **Operational** - Job assignments, schedule changes (high priority)
- **Informational** - Ratings received, performance updates (normal priority)
- **Marketing** - Promotions, announcements (low priority, opt-out available)

---

## Notification Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│ Trigger Event (Booking created, Status changed)      │
└────────────────────┬─────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────┐
│ Notification Service (FastAPI Backend)               │
│ - Determines recipients                              │
│ - Checks notification preferences                    │
│ - Selects channels (push, email, in-app)            │
│ - Renders templates                                  │
└────────────────────┬─────────────────────────────────┘
                     ↓
         ┌───────────┴───────────┬────────────────┐
         ↓                       ↓                ↓
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Firebase Cloud  │    │ Email Service    │    │ WebSocket        │
│ Messaging (FCM) │    │ (SendGrid/SES)   │    │ (In-App)         │
│ Push to mobile  │    │ Send email       │    │ Real-time update │
└────────┬────────┘    └────────┬─────────┘    └────────┬─────────┘
         ↓                       ↓                        ↓
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Customer/Tech   │    │ Email Inbox      │    │ App UI           │
│ Mobile Device   │    │ Customer/Admin   │    │ Notification     │
│ Notification    │    │ Email received   │    │ Bell updates     │
└─────────────────┘    └──────────────────┘    └──────────────────┘
```

### Database Tables

**notifications Table:**
```sql
id, user_id, type, title, message, data (JSON),
read_at, created_at, channel (push/email/in-app)
```

**notification_preferences Table:**
```sql
user_id, channel, category, enabled
```

**notification_tokens Table:**
```sql
user_id, device_id, fcm_token, platform, last_used_at
```

---

## Admin Notifications

### Admin Notification Triggers

**1. New Booking Submitted**

```
Trigger: Booking created (status: "Submitted")

Channels: Push + Email + In-App

Template:
Title: "New Booking Submitted"
Message: "Booking #KJ-2026-001234 from Juan Dela Cruz"
Priority: High

Data:
{
  "booking_id": "uuid",
  "reference_id": "KJ-2026-001234",
  "customer_name": "Juan Dela Cruz",
  "service": "Aircon Repair",
  "date": "2026-09-15 10:00 AM",
  "action_url": "/admin/appointments/uuid"
}

Email Subject: "[KJAC] New Booking: #KJ-2026-001234"
Email Body:
- Customer name
- Contact info
- Service details
- Preferred date/time
- Link to view booking
```

**2. Payment Receipt Uploaded**

```
Trigger: Customer uploads GCash receipt

Channels: Push + Email + In-App

Template:
Title: "Payment Receipt Uploaded"
Message: "Booking #KJ-2026-001234 - Verify payment"
Priority: High

Data:
{
  "booking_id": "uuid",
  "reference_id": "KJ-2026-001234",
  "amount": 500.00,
  "gcash_reference": "1234567890123",
  "action_url": "/admin/payments/pending"
}

Email Subject: "[KJAC] Payment Uploaded: #KJ-2026-001234"
Email Body:
- Booking reference
- Amount uploaded
- GCash reference
- Receipt preview image
- Link to verify payment
```

**3. Technician Location Updated**

```
Trigger: Technician updates job status (On the way, Arrived)

Channels: In-App only

Template:
Title: "Technician Status Update"
Message: "[Technician Name] is on the way to customer"
Priority: Normal

Data:
{
  "booking_id": "uuid",
  "technician_name": "Pedro Santos",
  "status": "on_the_way",
  "customer_name": "Juan Dela Cruz",
  "action_url": "/admin/appointments/uuid"
}

Note: Real-time update, no email
```

**4. New Customer/Technician Message**

```
Trigger: Customer or technician sends chat message

Channels: Push + In-App

Template:
Title: "New Message from [Sender Name]"
Message: "[Message preview...]"
Priority: Normal

Data:
{
  "booking_id": "uuid",
  "sender_name": "Juan Dela Cruz",
  "sender_role": "customer",
  "message_preview": "When will the technician...",
  "action_url": "/admin/chat/uuid"
}

Note: No email for individual messages
```

**5. Refund Request Pending**

```
Trigger: Customer cancels booking requiring admin refund approval

Channels: Push + Email + In-App

Template:
Title: "Refund Request Pending Approval"
Message: "Booking #KJ-2026-001234 - ₱500.00 refund"
Priority: High

Data:
{
  "refund_id": "uuid",
  "booking_id": "uuid",
  "amount": 500.00,
  "customer_name": "Juan Dela Cruz",
  "cancellation_reason": "Change of schedule",
  "action_url": "/admin/payments/refunds"
}

Email Subject: "[KJAC] Refund Pending: #KJ-2026-001234"
Email Body:
- Booking details
- Refund amount
- Cancellation reason
- Customer info
- Link to approve/deny refund
```

**6. Low Inventory Alert**

```
Trigger: Inventory item quantity below threshold

Channels: Push + Email

Template:
Title: "Low Inventory Alert"
Message: "[Item Name] stock is low (X units remaining)"
Priority: High

Data:
{
  "item_id": "uuid",
  "item_name": "R410A Refrigerant",
  "current_quantity": 2,
  "threshold": 5,
  "action_url": "/admin/inventory"
}

Email Subject: "[KJAC] Low Inventory: R410A Refrigerant"
Email Body:
- Item details
- Current quantity
- Reorder threshold
- Link to inventory page
```

**7. Technician Registration Pending**

```
Trigger: Technician submits self-registration

Channels: Push + Email + In-App

Template:
Title: "New Technician Registration"
Message: "[Name] applied to join as technician"
Priority: High

Data:
{
  "technician_id": "uuid",
  "name": "Pedro Santos",
  "email": "pedro@email.com",
  "submitted_at": "2026-09-10 10:30 AM",
  "action_url": "/admin/technicians/pending"
}

Email Subject: "[KJAC] New Technician Application"
Email Body:
- Applicant details
- Contact info
- Application date
- Link to review application
```

**8. Booking Expiring Soon**

```
Trigger: Booking submitted, payment not uploaded, 30 mins before expiry

Channels: In-App only

Template:
Title: "Booking Expiring Soon"
Message: "Booking #KJ-2026-001234 expires in 30 minutes"
Priority: Normal

Data:
{
  "booking_id": "uuid",
  "reference_id": "KJ-2026-001234",
  "expires_at": "2026-09-10 13:00:00",
  "action_url": "/admin/appointments/uuid"
}

Note: Reminder to follow up with customer
```

---

## Customer Notifications

### Customer Notification Triggers

**1. Booking Confirmation (Email Verification)**

```
Trigger: Booking created successfully

Channels: Email only

Template:
Email Subject: "[KJAC] Booking Confirmed: #KJ-2026-001234"

Email Body:
Title: "Your Booking is Submitted!"

Content:
- Thank you for choosing KJAC
- Booking reference: #KJ-2026-001234
- Service details
- Preferred date/time
- Location
- Down payment: ₱500.00

Important:
- Upload payment within 3 hours
- Booking expires at: [time]
- Save your reference ID

Payment Instructions:
[GCash account details]
[Link to upload payment]

Links:
- [Upload Payment Now]
- [Track Booking Status]

Footer:
- Contact info
- Business hours
- Support email
```

**2. Payment Verified**

```
Trigger: Admin verifies payment

Channels: Push + Email

Push Notification:
Title: "Payment Verified!"
Message: "Your booking #KJ-2026-001234 is confirmed"
Priority: High

Data:
{
  "booking_id": "uuid",
  "reference_id": "KJ-2026-001234",
  "action": "view_booking"
}

Email Subject: "[KJAC] Payment Verified - Booking Confirmed"

Email Body:
Title: "Payment Verified! ✓"

Content:
- Your payment has been verified
- Booking is now confirmed
- Reference: #KJ-2026-001234
- Service: [Service name]
- Date: [Date and time]

What's Next:
- Technician will be assigned soon
- You'll receive technician details
- Technician will arrive on scheduled date

[View Booking Details] button
```

**3. Payment Rejected**

```
Trigger: Admin rejects payment

Channels: Push + Email

Push Notification:
Title: "Payment Verification Failed"
Message: "Please re-upload correct receipt"
Priority: High

Email Subject: "[KJAC] Payment Verification Failed"

Email Body:
Title: "Payment Verification Failed"

Content:
- We couldn't verify your payment
- Booking: #KJ-2026-001234
- Reason: [Rejection reason]

Required Action:
- Upload correct GCash receipt
- Ensure reference number is visible
- Booking expires in: [countdown]

[Upload Payment Again] button

Need Help? [Contact Support]
```

**4. Technician Assigned**

```
Trigger: Admin assigns technician to booking

Channels: Push + Email

Push Notification:
Title: "Technician Assigned"
Message: "Pedro Santos will handle your service"
Priority: High

Email Subject: "[KJAC] Technician Assigned: #KJ-2026-001234"

Email Body:
Title: "Meet Your Technician"

Technician Details:
[Photo]
Name: Pedro Santos
Rating: ⭐ 4.8 (120 reviews)
Experience: 5 years
Specialization: Aircon repair & installation

Contact: 0917-234-5678

Appointment Details:
- Date: Sept 15, 2026
- Time: 10:00 AM
- Service: Aircon Repair
- Location: [Address]

[View Booking Details] button
```

**5. Technician On the Way**

```
Trigger: Technician updates status to "On the way"

Channels: Push + SMS (future)

Push Notification:
Title: "Technician On the Way"
Message: "Pedro Santos is heading to your location"
Priority: High
Sound: Default notification sound

Data:
{
  "booking_id": "uuid",
  "technician_name": "Pedro Santos",
  "eta": "10 minutes",
  "action": "view_booking"
}

SMS (Future):
"Your KJAC technician Pedro Santos is on the way. ETA: 10 mins. Track: [link]"
```

**6. Technician Arrived**

```
Trigger: Technician updates status to "Arrived"

Channels: Push

Push Notification:
Title: "Technician Arrived"
Message: "Pedro Santos has arrived at your location"
Priority: High
Sound: Alert sound

Data:
{
  "booking_id": "uuid",
  "technician_name": "Pedro Santos",
  "action": "view_booking"
}
```

**7. Service Started**

```
Trigger: Technician starts service

Channels: Push

Push Notification:
Title: "Service Started"
Message: "Your aircon repair service has begun"
Priority: Normal

Data:
{
  "booking_id": "uuid",
  "service": "Aircon Repair",
  "started_at": "2026-09-15 10:30 AM",
  "action": "view_booking"
}
```

**8. Service Completed**

```
Trigger: Technician completes service

Channels: Push + Email

Push Notification:
Title: "Service Completed!"
Message: "Please rate your technician Pedro Santos"
Priority: High

Data:
{
  "booking_id": "uuid",
  "technician_name": "Pedro Santos",
  "action": "rate_service"
}

Email Subject: "[KJAC] Service Completed - Rate Your Experience"

Email Body:
Title: "Service Completed! ✓"

Content:
- Your aircon repair is complete
- Service duration: 1 hour 30 minutes
- Technician: Pedro Santos

Service Summary:
- Work performed: [Description]
- Parts used: [List]
- Total charges: ₱1,700.00

Payment Balance:
- Down payment: ₱500.00 (paid)
- Balance paid: ₱1,000.00
- Additional charges: ₱200.00

[Download Receipt] button

Rate Your Experience:
Help us improve! Rate Pedro's service.

[Rate Technician] button (⭐⭐⭐⭐⭐)
```

**9. Rating Request Reminder**

```
Trigger: Service completed, not rated after 24 hours

Channels: Push

Push Notification:
Title: "Rate Your Recent Service"
Message: "How was your experience with Pedro Santos?"
Priority: Normal

Data:
{
  "booking_id": "uuid",
  "technician_name": "Pedro Santos",
  "completed_at": "2026-09-15 11:30 AM",
  "action": "rate_service"
}
```

**10. Booking Expiring Soon**

```
Trigger: 30 minutes before booking expires

Channels: Push + Email

Push Notification:
Title: "Booking Expiring Soon!"
Message: "Upload payment in 30 mins or booking will be cancelled"
Priority: High

Email Subject: "[KJAC] URGENT: Booking Expires in 30 Minutes"

Email Body:
Title: "⚠️ Your Booking is Expiring Soon"

Content:
- Booking: #KJ-2026-001234
- Expires at: [Time]
- Time remaining: 30 minutes

Action Required:
- Upload GCash payment receipt immediately
- Amount: ₱500.00

[Upload Payment Now] (large button)

[GCash Payment Instructions]
```

**11. Booking Cancelled**

```
Trigger: Booking cancelled (by customer or admin)

Channels: Push + Email

Push Notification:
Title: "Booking Cancelled"
Message: "Booking #KJ-2026-001234 has been cancelled"
Priority: High

Email Subject: "[KJAC] Booking Cancelled: #KJ-2026-001234"

Email Body:
Title: "Booking Cancelled"

Content:
- Booking: #KJ-2026-001234
- Cancelled at: [Timestamp]
- Cancelled by: [Customer/Admin]
- Reason: [Reason]

Refund Information:
[If eligible:]
- Refund status: Approved
- Amount: ₱500.00
- Processing time: 3-5 business days
- Refund method: GCash

[If not eligible:]
- Refund status: Not applicable
- Reason: Late cancellation (technician dispatched)

[View Cancellation Details]
[Book Again] button
```

**12. Refund Processed**

```
Trigger: Admin approves refund

Channels: Push + Email

Push Notification:
Title: "Refund Approved"
Message: "₱500.00 will be returned in 3-5 days"
Priority: High

Email Subject: "[KJAC] Refund Approved: ₱500.00"

Email Body:
Title: "Refund Approved ✓"

Content:
- Booking: #KJ-2026-001234
- Refund amount: ₱500.00
- Approved by: Admin
- Processing time: 3-5 business days
- Refund method: GCash

You will receive:
- Full refund to your GCash account
- Confirmation SMS when received
- Refund reference number

[Track Refund Status]
```

**13. Schedule Rescheduled**

```
Trigger: Admin reschedules booking

Channels: Push + Email

Push Notification:
Title: "Appointment Rescheduled"
Message: "New date: Sept 16 at 2:00 PM"
Priority: High

Email Subject: "[KJAC] Appointment Rescheduled"

Email Body:
Title: "Your Appointment Has Been Rescheduled"

Content:
- Booking: #KJ-2026-001234

Previous Schedule:
- Date: Sept 15, 2026
- Time: 10:00 AM

New Schedule:
- Date: Sept 16, 2026
- Time: 2:00 PM

Reason: [Reschedule reason]

[Confirm New Schedule]
[Need different time? Contact us]
```

**14. Promotion Available**

```
Trigger: New promotion created

Channels: Push + Email (if opted in)

Push Notification:
Title: "Special Offer!"
Message: "20% off aircon cleaning this week"
Priority: Low
Can be dismissed

Email Subject: "[KJAC] Special Offer: 20% Off Aircon Cleaning"

Email Body:
Title: "Limited Time Offer!"

Content:
[Promotion banner]

- 20% off Aircon Cleaning
- Valid until: Sept 30, 2026
- Promo code: CLEAN20

Terms:
- Minimum purchase: ₱1,000
- New bookings only
- Cannot be combined with other offers

[Book Now] button

Unsubscribe link at bottom
```

---

## Technician Notifications

### Technician Notification Triggers

**1. New Job Assigned**

```
Trigger: Admin assigns technician to booking

Channels: Push + Email

Push Notification:
Title: "New Job Assigned"
Message: "Aircon Repair at 123 Main St on Sept 15"
Priority: High
Sound: Alert sound

Data:
{
  "booking_id": "uuid",
  "service": "Aircon Repair",
  "customer_name": "Juan Dela Cruz",
  "date": "2026-09-15 10:00 AM",
  "location": "123 Main St, Sta. Cruz",
  "action": "view_job"
}

Email Subject: "[KJAC] New Job Assignment"

Email Body:
Title: "New Job Assigned to You"

Job Details:
- Booking: #KJ-2026-001234
- Service: Aircon Repair
- Brand: Daikin
- Date: Sept 15, 2026 at 10:00 AM

Customer Information:
- Name: Juan Dela Cruz
- Phone: 0917-123-4567
- Address: 123 Main St, Brgy. Labuin, Sta. Cruz
- Landmark: Near McDonald's

Problem Description:
"Aircon not cooling properly..."

Customer Photos:
[Thumbnails]

[View Full Job Details]
[Start Navigation]

Important:
- Arrive on time
- Contact customer if running late
- Update job status in app
```

**2. Schedule Changed**

```
Trigger: Admin reschedules job

Channels: Push + Email

Push Notification:
Title: "Job Rescheduled"
Message: "Booking #KJ-2026-001234 moved to Sept 16"
Priority: High

Email Subject: "[KJAC] Job Schedule Changed"

Email Body:
Title: "Job Schedule Updated"

Booking: #KJ-2026-001234

Previous Schedule:
- Sept 15, 2026 at 10:00 AM

New Schedule:
- Sept 16, 2026 at 2:00 PM

Customer: Juan Dela Cruz
Location: Sta. Cruz, Laguna

[View Updated Schedule]
[Contact Admin]
```

**3. Job Cancelled**

```
Trigger: Customer or admin cancels booking

Channels: Push + Email

Push Notification:
Title: "Job Cancelled"
Message: "Booking #KJ-2026-001234 has been cancelled"
Priority: High

Email Subject: "[KJAC] Job Cancellation: #KJ-2026-001234"

Email Body:
Title: "Job Cancelled"

Content:
- Booking: #KJ-2026-001234
- Customer: Juan Dela Cruz
- Cancelled at: [Timestamp]
- Cancelled by: [Customer/Admin]
- Reason: [Cancellation reason]

This job has been removed from your schedule.

[View Updated Schedule]
```

**4. New Customer Message**

```
Trigger: Customer sends message via admin

Channels: Push

Push Notification:
Title: "Message from Admin"
Message: "Re: Booking #KJ-2026-001234"
Priority: Normal

Data:
{
  "booking_id": "uuid",
  "sender": "Admin",
  "message_preview": "Customer asking about arrival time...",
  "action": "open_chat"
}
```

**5. New Rating Received**

```
Trigger: Customer rates technician

Channels: Push + Email

Push Notification:
Title: "New Rating Received"
Message: "⭐ 5 stars from Maria Santos"
Priority: Normal

Data:
{
  "booking_id": "uuid",
  "rating": 5,
  "customer_name": "Maria Santos",
  "action": "view_rating"
}

Email Subject: "[KJAC] You received a 5-star rating!"

Email Body:
Title: "Great Job! ⭐⭐⭐⭐⭐"

Content:
Customer: Maria Santos
Booking: #KJ-2026-001234
Service: Aircon Installation
Rating: 5 stars

Review:
"Excellent service! Very professional and thorough. 
 Explained everything clearly. Highly recommended!"

Keep up the great work!

Your Stats:
- Total ratings: 121
- Average rating: 4.8 ⭐
- 5-star ratings: 86%

[View Full Review]
[View Performance]
```

**6. Upcoming Appointment Reminder**

```
Trigger: 1 hour before scheduled appointment

Channels: Push

Push Notification:
Title: "Appointment in 1 Hour"
Message: "Juan Dela Cruz at 123 Main St, 10:00 AM"
Priority: High
Sound: Alert sound

Data:
{
  "booking_id": "uuid",
  "customer_name": "Juan Dela Cruz",
  "time": "10:00 AM",
  "address": "123 Main St, Sta. Cruz",
  "action": "view_job"
}
```

**7. Profile Change Approved**

```
Trigger: Admin approves technician profile update

Channels: Push + Email

Push Notification:
Title: "Profile Changes Approved"
Message: "Your profile has been updated"
Priority: Normal

Email Subject: "[KJAC] Profile Update Approved"

Email Body:
Title: "Profile Changes Approved ✓"

Content:
Your requested profile changes have been approved.

Updated Information:
- [List of approved changes]

Your profile is now up to date.

[View Profile]
```

**8. Profile Change Rejected**

```
Trigger: Admin rejects technician profile update

Channels: Push + Email

Push Notification:
Title: "Profile Changes Not Approved"
Message: "Contact admin for details"
Priority: Normal

Email Subject: "[KJAC] Profile Update Not Approved"

Email Body:
Title: "Profile Changes Not Approved"

Content:
Your requested profile changes were not approved.

Reason: [Admin's reason]

If you have questions, please contact admin.

[Contact Admin]
```

---

## Email Notifications

### Email Template Structure

**Standard Email Layout:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>[Email Subject]</title>
</head>
<body style="font-family: 'Inter', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  
  <!-- Email Container -->
  <table style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <tr>
      <td style="background-color: #38b6ff; padding: 30px 40px; text-align: center;">
        <img src="[LOGO_URL]" alt="KJAC" style="height: 50px;">
        <h1 style="color: #ffffff; margin: 10px 0 0 0; font-size: 24px;">Klein & Justin Airconditioning</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 40px;">
        
        <!-- Email Title -->
        <h2 style="color: #333333; margin-top: 0;">[Email Title]</h2>
        
        <!-- Email Body -->
        <p style="color: #666666; line-height: 1.6;">
          [Email content goes here]
        </p>
        
        <!-- Call-to-Action Button -->
        <table style="margin: 30px 0;">
          <tr>
            <td style="background-color: #38b6ff; border-radius: 6px; text-align: center;">
              <a href="[ACTION_URL]" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600;">
                [Button Text]
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Additional Info -->
        <div style="background-color: #f8f9fa; border-left: 4px solid #38b6ff; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #666666;">
            [Important note or additional information]
          </p>
        </div>
        
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e0e0e0;">
        
        <p style="color: #999999; font-size: 14px; margin: 0 0 10px 0;">
          Klein & Justin Airconditioning
        </p>
        
        <p style="color: #999999; font-size: 12px; margin: 0 0 5px 0;">
          060 Sitio Narra, Brgy. Labuin, Sta. Cruz, Laguna
        </p>
        
        <p style="color: #999999; font-size: 12px; margin: 0 0 15px 0;">
          📞 0926-633-3129 | 📧 abadeciomar@yahoo.com
        </p>
        
        <p style="color: #999999; font-size: 12px; margin: 0;">
          <a href="[UNSUBSCRIBE_URL]" style="color: #38b6ff; text-decoration: none;">Unsubscribe</a> | 
          <a href="[PRIVACY_URL]" style="color: #38b6ff; text-decoration: none;">Privacy Policy</a>
        </p>
        
      </td>
    </tr>
    
  </table>
  
</body>
</html>
```

---

## Push Notifications

### Push Notification Structure

**FCM Payload Format:**

```json
{
  "notification": {
    "title": "Technician On the Way",
    "body": "Pedro Santos is heading to your location",
    "sound": "default",
    "badge": "1",
    "icon": "notification_icon",
    "color": "#38b6ff"
  },
  "data": {
    "type": "booking_update",
    "booking_id": "uuid",
    "reference_id": "KJ-2026-001234",
    "action": "view_booking",
    "action_url": "/bookings/uuid",
    "priority": "high",
    "timestamp": "2026-09-15T09:45:00Z"
  },
  "android": {
    "priority": "high",
    "notification": {
      "channel_id": "booking_updates",
      "click_action": "FLUTTER_NOTIFICATION_CLICK"
    }
  },
  "apns": {
    "payload": {
      "aps": {
        "alert": {
          "title": "Technician On the Way",
          "body": "Pedro Santos is heading to your location"
        },
        "sound": "default",
        "badge": 1,
        "content-available": 1
      }
    }
  }
}
```

**Notification Channels (Android):**

```kotlin
// High Priority Channel (Booking updates, job assignments)
id: "booking_updates"
name: "Booking Updates"
importance: HIGH
sound: Default
vibration: Enabled

// Normal Priority Channel (Informational)
id: "general_notifications"
name: "General Notifications"
importance: DEFAULT
sound: Default
vibration: Enabled

// Low Priority Channel (Marketing)
id: "promotions"
name: "Promotions & Offers"
importance: LOW
sound: None
vibration: Disabled
```

---

## In-App Notifications

### WebSocket Real-Time Updates

**Connection Flow:**

```
1. User logs in
   ↓
2. App connects to WebSocket server
   - URL: wss://api.kjac.com/ws/notifications
   - Auth: JWT token in headers
   ↓
3. Server assigns user to notification room
   - Room: user_[user_id]
   ↓
4. Events are broadcasted to user's room
   ↓
5. App receives notification
   ↓
6. Update notification bell badge
   Display toast/banner
   Add to notification list
   ↓
7. User taps notification
   - Mark as read
   - Navigate to relevant page
```

**WebSocket Message Format:**

```json
{
  "event": "notification",
  "data": {
    "id": "notification_uuid",
    "type": "booking_update",
    "title": "Payment Verified!",
    "message": "Your booking #KJ-2026-001234 is confirmed",
    "priority": "high",
    "action": "view_booking",
    "action_data": {
      "booking_id": "uuid",
      "reference_id": "KJ-2026-001234"
    },
    "created_at": "2026-09-10T10:30:00Z",
    "read": false
  }
}
```

---

## Notification Preferences

### User Preference Management

**Default Preferences (on account creation):**

```json
{
  "user_id": "uuid",
  "preferences": {
    "push": {
      "booking_updates": true,
      "payment_updates": true,
      "service_updates": true,
      "promotions": true,
      "announcements": true
    },
    "email": {
      "booking_updates": true,
      "payment_updates": true,
      "service_updates": true,
      "promotions": false,  // Opt-in for marketing
      "announcements": true
    },
    "sms": {  // Future
      "booking_updates": false,
      "payment_updates": false,
      "service_updates": false
    }
  }
}
```

**Preference Update API:**

```
PUT /api/user/notification-preferences

Request:
{
  "channel": "push",
  "category": "promotions",
  "enabled": false
}

Response:
{
  "success": true,
  "preferences": { ... }
}
```

**Important Notes:**

- **Transactional notifications** (booking confirmations, payment receipts) CANNOT be disabled
- **Operational notifications** (job assignments for technicians) CANNOT be disabled
- **Marketing notifications** (promotions) CAN be disabled (opt-out)
- **Unsubscribe link** in all marketing emails

---

## Notification Delivery Logic

### Delivery Priority & Retry Logic

**Priority Levels:**

1. **Critical** - Immediate delivery, retry up to 5 times
   - Payment rejections
   - Booking expiring (last warning)
   - Emergency cancellations

2. **High** - Deliver within 1 minute, retry up to 3 times
   - Booking confirmations
   - Payment verifications
   - Job assignments
   - Technician status updates

3. **Normal** - Deliver within 5 minutes, retry up to 2 times
   - General messages
   - Ratings received
   - Schedule reminders

4. **Low** - Deliver when convenient, retry once
   - Promotions
   - Announcements
   - Non-urgent updates

**Retry Strategy:**

```
Attempt 1: Immediate
Attempt 2: After 1 minute
Attempt 3: After 5 minutes
Attempt 4: After 15 minutes
Attempt 5: After 1 hour

After max retries: Mark as failed, log error
```

**Failure Handling:**

```
If push notification fails:
└─> Fallback to email (if enabled)
    └─> If email also fails:
        └─> Log error
            Create in-app notification
            Alert admin (for critical notifications)
```

---

## Templates & Content

### Notification Content Guidelines

**Tone & Voice:**
- Friendly and professional
- Clear and concise
- Action-oriented
- Avoid jargon

**Title Guidelines:**
- Max 50 characters
- Start with action or status
- Include key identifier (booking #)

**Message Guidelines:**
- Max 150 characters for push
- Provide context
- Include next step (if applicable)
- Use emojis sparingly (only for celebratory messages)

**Email Subject Guidelines:**
- Max 60 characters
- Include business name [KJAC]
- Include booking reference (if applicable)
- Descriptive and specific

**Localization (Future):**
- English (default)
- Filipino/Tagalog
- Template variables support translations

---

**Document End**

**Last Updated:** September 10, 2026  
**Version:** 1.0  
**Maintained By:** KJAC Development Team

For related documentation:
- `FLOW_BOOKING.md` - Booking status changes trigger notifications
- `FLOW_ADMIN.md` - Admin notification handling
- `FLOW_CUSTOMER.md` - Customer notification preferences
- `FLOW_TECHNICIAN.md` - Technician notification preferences
- `API.md` - Notification API endpoints
- `DATABASE_TABLES.md` - Notification tables schema