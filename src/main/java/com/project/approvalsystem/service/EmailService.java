package com.project.approvalsystem.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Random;
import java.util.Set;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    // ===================== OTP STORAGE (in memory) =====================
    private Map<String, String> otpStore      = new HashMap<>();
    // Tracks emails that passed OTP verify — allows reset-password without re-checking OTP
    private Set<String>         verifiedEmails = new HashSet<>();

    // ===================== SEND OTP =====================
    public void sendOtp(String toEmail) throws MessagingException {
        String otp = String.valueOf(100000 + new Random().nextInt(900000));
        otpStore.put(toEmail, otp);
        verifiedEmails.remove(toEmail); // reset any previous verification

        String subject = "🔐 Password Reset OTP - Leave Portal";
        String body = """
                <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:30px;border-radius:12px;border:1px solid #e2e8f0">
                  <h2 style="color:#5b6af5">Leave Approval Portal</h2>
                  <p style="color:#334155">You requested a password reset. Use the OTP below:</p>
                  <div style="background:#eef0ff;border-radius:10px;padding:20px;text-align:center;margin:20px 0">
                    <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#5b6af5">%s</span>
                  </div>
                  <p style="color:#64748b;font-size:13px">This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
                  <p style="color:#64748b;font-size:13px">If you did not request this, please ignore this email.</p>
                </div>
                """.formatted(otp);

        sendHtmlEmail(toEmail, subject, body);
    }

    // ===================== VERIFY OTP =====================
    // Only checks — does NOT remove OTP. Marks email as verified instead.
    public boolean verifyOtp(String email, String otp) {
        String stored = otpStore.get(email);
        if (stored != null && stored.equals(otp)) {
            otpStore.remove(email);        // remove OTP so it can't be reused
            verifiedEmails.add(email);     // mark as verified for reset-password step
            return true;
        }
        return false;
    }

    // ===================== CHECK IF EMAIL IS VERIFIED (for reset-password) =====================
    public boolean isOtpVerified(String email) {
        return verifiedEmails.contains(email);
    }

    // ===================== CLEAR VERIFICATION (call after password reset) =====================
    public void clearVerification(String email) {
        verifiedEmails.remove(email);
        otpStore.remove(email);
    }

    // ===================== LEAVE APPLIED — notify student + teacher =====================
    public void sendLeaveApplied(String studentEmail, String studentName,
                                  String teacherEmail, String teacherName,
                                  int days, String reason) throws MessagingException {

        sendHtmlEmail(studentEmail,
            "✅ Leave Request Submitted - Leave Portal",
            buildEmail("Leave Request Submitted", studentName,
                "Your leave request has been successfully submitted and is pending teacher approval.",
                new String[][]{
                    {"Days", String.valueOf(days)},
                    {"Reason", reason},
                    {"Status", "Pending (Teacher)"}
                }, "#f59e0b"));

        sendHtmlEmail(teacherEmail,
            "📋 New Leave Request from " + studentName,
            buildEmail("New Leave Request", teacherName,
                "A student has submitted a new leave request that requires your approval.",
                new String[][]{
                    {"Student", studentName},
                    {"Days", String.valueOf(days)},
                    {"Reason", reason},
                    {"Status", "Pending Your Approval"}
                }, "#5b6af5"));
    }

    // ===================== LEAVE CANCELLED — notify student + teacher =====================
    public void sendLeaveCancelled(String studentEmail, String studentName,
                                    String teacherEmail, String teacherName,
                                    int days) throws MessagingException {

        sendHtmlEmail(studentEmail,
            "↩️ Leave Request Cancelled - Leave Portal",
            buildEmail("Leave Cancelled", studentName,
                "Your leave request has been cancelled successfully.",
                new String[][]{
                    {"Days", String.valueOf(days)},
                    {"Status", "Cancelled"}
                }, "#64748b"));

        sendHtmlEmail(teacherEmail,
            "↩️ Leave Cancelled by " + studentName,
            buildEmail("Leave Cancelled", teacherName,
                "A student has cancelled their leave request.",
                new String[][]{
                    {"Student", studentName},
                    {"Days", String.valueOf(days)},
                    {"Status", "Cancelled"}
                }, "#64748b"));
    }

    // ===================== TEACHER APPROVED (days <= 3) =====================
    public void sendApprovedByTeacher(String studentEmail, String studentName,
                                       String teacherName, int days) throws MessagingException {
        sendHtmlEmail(studentEmail,
            "✅ Leave Approved by Teacher - Leave Portal",
            buildEmail("Leave Approved!", studentName,
                "Great news! Your leave request has been approved by " + teacherName + ".",
                new String[][]{
                    {"Days", String.valueOf(days)},
                    {"Approved By", teacherName},
                    {"Status", "Approved ✓"}
                }, "#22c55e"));
    }

    // ===================== FORWARDED TO HOD =====================
    public void sendForwardedToHod(String studentEmail, String studentName,
                                    String hodEmail, String hodName,
                                    String teacherName, int days,
                                    String reason) throws MessagingException {

        sendHtmlEmail(studentEmail,
            "📋 Leave Forwarded to HOD - Leave Portal",
            buildEmail("Leave Forwarded to HOD", studentName,
                "Your leave has been approved by " + teacherName + " and forwarded to HOD for final approval.",
                new String[][]{
                    {"Days", String.valueOf(days)},
                    {"Teacher Approval", "✓ Approved"},
                    {"Status", "Pending HOD Approval"}
                }, "#f59e0b"));

        sendHtmlEmail(hodEmail,
            "📋 Leave Request Requires Your Approval - Leave Portal",
            buildEmail("New Leave Request", hodName,
                "A leave request has been approved by the teacher and requires your approval.",
                new String[][]{
                    {"Student", studentName},
                    {"Days", String.valueOf(days)},
                    {"Reason", reason},
                    {"Status", "Pending Your Approval"}
                }, "#5b6af5"));
    }

    // ===================== HOD APPROVED (days <= 10) =====================
    public void sendApprovedByHod(String studentEmail, String studentName,
                                   String hodName, int days) throws MessagingException {
        sendHtmlEmail(studentEmail,
            "✅ Leave Approved by HOD - Leave Portal",
            buildEmail("Leave Approved!", studentName,
                "Your leave request has been fully approved by " + hodName + ".",
                new String[][]{
                    {"Days", String.valueOf(days)},
                    {"Approved By", hodName},
                    {"Status", "Approved by HOD ✓"}
                }, "#22c55e"));
    }

    // ===================== FORWARDED TO DIRECTOR =====================
    public void sendForwardedToDirector(String studentEmail, String studentName,
                                         String directorEmail, String directorName,
                                         String hodName, int days,
                                         String reason) throws MessagingException {

        sendHtmlEmail(studentEmail,
            "📋 Leave Forwarded to Director - Leave Portal",
            buildEmail("Leave Forwarded to Director", studentName,
                "Your leave has been approved by HOD and forwarded to the Director for final approval.",
                new String[][]{
                    {"Days", String.valueOf(days)},
                    {"HOD Approval", "✓ Approved"},
                    {"Status", "Pending Director Approval"}
                }, "#f59e0b"));

        sendHtmlEmail(directorEmail,
            "📋 Leave Request Requires Your Approval - Leave Portal",
            buildEmail("New Leave Request", directorName,
                "A leave request has been approved by HOD and requires your final approval.",
                new String[][]{
                    {"Student", studentName},
                    {"Days", String.valueOf(days)},
                    {"Reason", reason},
                    {"Status", "Pending Your Approval"}
                }, "#5b6af5"));
    }

    // ===================== DIRECTOR APPROVED =====================
    public void sendApprovedByDirector(String studentEmail, String studentName,
                                        String directorName, int days) throws MessagingException {
        sendHtmlEmail(studentEmail,
            "✅ Leave Fully Approved by Director - Leave Portal",
            buildEmail("Leave Fully Approved!", studentName,
                "Your leave request has been fully approved by " + directorName + ".",
                new String[][]{
                    {"Days", String.valueOf(days)},
                    {"Approved By", directorName},
                    {"Status", "Approved by Director ✓"}
                }, "#22c55e"));
    }

    // ===================== LEAVE REJECTED =====================
    public void sendRejected(String studentEmail, String studentName,
                              String rejectedBy, int days) throws MessagingException {
        sendHtmlEmail(studentEmail,
            "❌ Leave Request Rejected - Leave Portal",
            buildEmail("Leave Rejected", studentName,
                "Unfortunately your leave request has been rejected by " + rejectedBy + ".",
                new String[][]{
                    {"Days", String.valueOf(days)},
                    {"Rejected By", rejectedBy},
                    {"Status", "Rejected"}
                }, "#ef4444"));
    }

    // ===================== HELPER: BUILD HTML EMAIL =====================
    private String buildEmail(String title, String recipientName,
                               String message, String[][] details,
                               String accentColor) {
        StringBuilder rows = new StringBuilder();
        for (String[] detail : details) {
            rows.append("""
                    <tr>
                      <td style="padding:8px 12px;color:#64748b;font-size:13px">%s</td>
                      <td style="padding:8px 12px;font-weight:600;font-size:13px">%s</td>
                    </tr>
                    """.formatted(detail[0], detail[1]));
        }

        return """
                <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:30px;border-radius:12px;border:1px solid #e2e8f0">
                  <div style="border-left:4px solid %s;padding-left:14px;margin-bottom:20px">
                    <h2 style="color:#0f1629;margin:0">%s</h2>
                    <p style="color:#64748b;margin:4px 0 0">Leave Approval Portal</p>
                  </div>
                  <p style="color:#334155">Hi <strong>%s</strong>,</p>
                  <p style="color:#334155">%s</p>
                  <table style="width:100%%;background:#f4f6fb;border-radius:10px;padding:8px;margin:20px 0;border-collapse:collapse">
                    %s
                  </table>
                  <p style="color:#94a3b8;font-size:12px;margin-top:24px">This is an automated message from the Leave Approval Portal. Please do not reply to this email.</p>
                </div>
                """.formatted(accentColor, title, recipientName, message, rows);
    }

    // ===================== HELPER: SEND HTML EMAIL =====================
    private void sendHtmlEmail(String to, String subject, String htmlBody) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromEmail);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(htmlBody, true);
        mailSender.send(message);
    }
}