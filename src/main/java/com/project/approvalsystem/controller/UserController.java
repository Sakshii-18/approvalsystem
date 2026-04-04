package com.project.approvalsystem.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.project.approvalsystem.entity.User;
import com.project.approvalsystem.repository.UserRepository;
import com.project.approvalsystem.service.EmailService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    // ===================== REGISTER USER =====================
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody User user) {

        if (userRepository.findByEmail(user.getEmail()) != null) {
            return ResponseEntity.badRequest().body("Email already registered");
        }

        if (user.getPrn() != null && !user.getPrn().isEmpty()) {
            if (userRepository.findByPrn(user.getPrn()) != null) {
                return ResponseEntity.badRequest().body("PRN already registered");
            }
        }

        // validate secret code for non-student roles
      if (!user.getRole().equals("Student")) {
    String expectedCode = switch (user.getRole()) {
        case "Teacher"  -> teacherCode;
        case "HOD"      -> hodCode;
        case "Director" -> directorCode;
        default -> null;
    };
    if (expectedCode == null || !expectedCode.equals(user.getSecretCode())) {
        return ResponseEntity.badRequest()
            .body("Invalid secret code for role: " + user.getRole());
    }
}

        User savedUser = userRepository.save(user);
        return ResponseEntity.ok(savedUser);
    }

    // ===================== LOGIN USER =====================
    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody User user) {

        User existingUser = userRepository.findByEmail(user.getEmail());

        if (existingUser == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        if (!existingUser.getPassword().equals(user.getPassword())) {
            return ResponseEntity.badRequest().body("Invalid password");
        }

        return ResponseEntity.ok(existingUser);
    }

    // ===================== GET ALL USERS =====================
    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // ===================== GET USER BY ID =====================
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {

        User user = userRepository.findById(id).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        return ResponseEntity.ok(user);
    }

    // ===================== CHANGE PASSWORD =====================
    @PatchMapping("/{id}/password")
    public ResponseEntity<?> changePassword(@PathVariable Long id, @RequestBody Map<String, String> body) {

        User user = userRepository.findById(id).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        String currentPassword = body.get("currentPassword");
        String newPassword     = body.get("newPassword");

        if (!user.getPassword().equals(currentPassword)) {
            return ResponseEntity.badRequest().body("Current password is incorrect");
        }

        user.setPassword(newPassword);
        userRepository.save(user);

        return ResponseEntity.ok("Password updated successfully");
    }

    // ===================== GET TEACHERS =====================
    @GetMapping("/teachers")
    public List<User> getTeachers() {
        return userRepository.findByRole("Teacher");
    }

    // ===================== FORGOT PASSWORD — SEND OTP =====================
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {

        String email = body.get("email");
        User user = userRepository.findByEmail(email);

        if (user == null) {
            return ResponseEntity.badRequest().body("No account found with this email");
        }

        try {
            emailService.sendOtp(email);
            return ResponseEntity.ok("OTP sent to " + email);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to send OTP. Try again.");
        }
    }

    // ===================== VERIFY OTP =====================
    // Just verifies OTP and marks email as verified — does NOT reset password
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {

        String email = body.get("email");
        String otp   = body.get("otp");

        boolean valid = emailService.verifyOtp(email, otp);
        if (!valid) {
            return ResponseEntity.badRequest().body("Invalid or expired OTP");
        }

        return ResponseEntity.ok("OTP verified");
    }

    // ===================== RESET PASSWORD =====================
    // No OTP needed here — just checks that email was already verified above
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {

        String email  = body.get("email");
        String newPwd = body.get("newPassword");

        // Check email was OTP-verified in the previous step
        if (!emailService.isOtpVerified(email)) {
            return ResponseEntity.badRequest().body("OTP not verified. Please verify OTP first.");
        }

        User user = userRepository.findByEmail(email);
        if (user == null) {
            return ResponseEntity.badRequest().body("User not found");
        }

        user.setPassword(newPwd);
        userRepository.save(user);

        // Clear verification so it can't be reused
        emailService.clearVerification(email);

        return ResponseEntity.ok("Password reset successfully");
    }

    
    
    @Value("${app.security.secret-code.teacher}")
private String teacherCode;

@Value("${app.security.secret-code.hod}")
private String hodCode;

@Value("${app.security.secret-code.director}")
private String directorCode;
}