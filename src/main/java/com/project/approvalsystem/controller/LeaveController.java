package com.project.approvalsystem.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.project.approvalsystem.entity.LeaveRequest;
import com.project.approvalsystem.entity.Notification;
import com.project.approvalsystem.entity.User;
import com.project.approvalsystem.repository.LeaveRepository;
import com.project.approvalsystem.repository.NotificationRepository;
import com.project.approvalsystem.repository.UserRepository;
import com.project.approvalsystem.service.EmailService;

@RestController
@RequestMapping("/leave")
@CrossOrigin(origins = "*")
public class LeaveController {

    @Autowired private UserRepository userRepository;
    @Autowired private LeaveRepository leaveRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private EmailService emailService;

    // ── helper: save a notification row to DB ──────────────────────────────
    private void saveNotif(User toUser, String icon, String iconBg,
                           String message, String subText) {
        if (toUser == null) return;
        Notification n = new Notification();
        n.setUser(toUser);
        n.setIcon(icon);
        n.setIconBg(iconBg);
        n.setMessage(message);
        n.setSubText(subText);
        notificationRepository.save(n);
    }

    // ===================== APPLY LEAVE =====================
    @PostMapping
    public ResponseEntity<?> applyLeave(@RequestBody LeaveRequest leaveRequest) {

        if (leaveRequest.getTeacher() != null && leaveRequest.getTeacher().getId() != null) {
            User teacher = userRepository.findById(leaveRequest.getTeacher().getId()).orElse(null);
            if (teacher == null) return ResponseEntity.badRequest().body("Teacher not found");
            leaveRequest.setTeacher(teacher);
        }

        leaveRequest.setStatus("PENDING_TEACHER");
        leaveRequest.setAction("APPLIED");
        LeaveRequest saved = leaveRepository.save(leaveRequest);

            User student = leaveRequest.getUser();
            User teacher = leaveRequest.getTeacher();

        saveNotif(student, "📋", "#eef0ff",
                "Leave application submitted",
                "Pending Teacher approval · " + saved.getDays() + " day(s)");
        saveNotif(teacher, "🔔", "#fef3c7",
                "New leave request from " + (student != null ? student.getName() : "a student"),
                saved.getDays() + " day(s) · Reason: " + saved.getReason());

        try {
            if (student != null && teacher != null) {
                emailService.sendLeaveApplied(
                    student.getEmail(), student.getName(),
                    teacher.getEmail(), teacher.getName(),
                    saved.getDays(), saved.getReason()
                );
            }
        } catch (Exception e) {
            System.out.println("Email failed (apply): " + e.getMessage());
        }

        return ResponseEntity.ok(saved);
    }

    // ===================== GET ALL LEAVES =====================
    @GetMapping
    public List<LeaveRequest> getAllLeaves() {
        return leaveRepository.findAll();
    }

    // ===================== GET LEAVES BY USER ID =====================
    @GetMapping("/user/{userId}")
    public List<LeaveRequest> getLeavesByUser(@PathVariable Long userId) {
        return leaveRepository.findByUserId(userId);
    }

    // ===================== GET LEAVES BY TEACHER ID =====================
    @GetMapping("/teacher/{teacherId}")
    public List<LeaveRequest> getLeavesByTeacher(@PathVariable Long teacherId) {
        return leaveRepository.findByTeacherId(teacherId);
    }

    // ===================== APPROVE LEAVE =====================
    @PostMapping("/approve/{id}")
    public ResponseEntity<?> approveLeave(@PathVariable Long id) {

        LeaveRequest leave = leaveRepository.findById(id).orElse(null);
        if (leave == null) return ResponseEntity.badRequest().body("Leave not found");

        User student = leave.getUser();
        User teacher = leave.getTeacher();

        try {
            if (leave.getStatus().equals("PENDING_TEACHER")) {

                if (leave.getDays() <= 3) {
                    leave.setStatus("APPROVED_BY_TEACHER");
                    leave.setAction("APPROVED");
                    leaveRepository.save(leave);

                    saveNotif(student, "✅", "#dcfce7",
                            "Leave approved by " + (teacher != null ? teacher.getName() : "Teacher"),
                            "Your " + leave.getDays() + " day leave is approved!");

                    emailService.sendApprovedByTeacher(
                        student.getEmail(), student.getName(),
                        teacher != null ? teacher.getName() : "Teacher",
                        leave.getDays()
                    );

                } else {
                    leave.setStatus("PENDING_HOD");
                    leave.setAction("FORWARDED_TO_HOD");
                    leaveRepository.save(leave);

                    List<User> hods = userRepository.findByRole("HOD");
                    User hod = hods.isEmpty() ? null : hods.get(0);

                    saveNotif(student, "🔄", "#eef0ff",
                            "Leave approved by Teacher — forwarded to HOD",
                            "Waiting for HOD approval · " + leave.getDays() + " days");
                    saveNotif(hod, "🔔", "#fef3c7",
                            "Leave request from " + (student != null ? student.getName() : "a student") + " needs your approval",
                            leave.getDays() + " day(s) · Approved by " + (teacher != null ? teacher.getName() : "Teacher"));

                    if (hod != null) {
                        emailService.sendForwardedToHod(
                            student.getEmail(), student.getName(),
                            hod.getEmail(), hod.getName(),
                            teacher != null ? teacher.getName() : "Teacher",
                            leave.getDays(), leave.getReason()
                        );
                    }
                }

            } else if (leave.getStatus().equals("PENDING_HOD")) {

                if (leave.getDays() <= 10) {
                    leave.setStatus("APPROVED_BY_HOD");
                    leave.setAction("APPROVED");
                    leaveRepository.save(leave);

                    List<User> hods = userRepository.findByRole("HOD");
                    String hodName  = hods.isEmpty() ? "HOD" : hods.get(0).getName();

                    saveNotif(student, "✅", "#dcfce7",
                            "Leave fully approved by HOD",
                            "Your " + leave.getDays() + " day leave is approved!");

                    emailService.sendApprovedByHod(
                        student.getEmail(), student.getName(),
                        hodName, leave.getDays()
                    );

                } else {
                    leave.setStatus("PENDING_DIRECTOR");
                    leave.setAction("FORWARDED_TO_DIRECTOR");
                    leaveRepository.save(leave);

                    List<User> hods      = userRepository.findByRole("HOD");
                    List<User> directors = userRepository.findByRole("Director");
                    String hodName       = hods.isEmpty() ? "HOD" : hods.get(0).getName();
                    User director        = directors.isEmpty() ? null : directors.get(0);

                    saveNotif(student, "🔄", "#eef0ff",
                            "Leave approved by HOD — forwarded to Director",
                            "Waiting for Director approval · " + leave.getDays() + " days");
                    saveNotif(director, "🔔", "#fef3c7",
                            "Leave request from " + (student != null ? student.getName() : "a student") + " needs your approval",
                            leave.getDays() + " day(s) · Approved by " + hodName);

                    if (director != null) {
                        emailService.sendForwardedToDirector(
                            student.getEmail(), student.getName(),
                            director.getEmail(), director.getName(),
                            hodName, leave.getDays(), leave.getReason()
                        );
                    }
                }

            } else if (leave.getStatus().equals("PENDING_DIRECTOR")) {

                leave.setStatus("APPROVED_BY_DIRECTOR");
                leave.setAction("APPROVED");
                leaveRepository.save(leave);

                List<User> directors = userRepository.findByRole("Director");
                String directorName  = directors.isEmpty() ? "Director" : directors.get(0).getName();

                saveNotif(student, "✅", "#dcfce7",
                        "Leave fully approved by Director!",
                        "Your " + leave.getDays() + " day leave is approved!");

                emailService.sendApprovedByDirector(
                    student.getEmail(), student.getName(),
                    directorName, leave.getDays()
                );
            }

        } catch (Exception e) {
            System.out.println("Email failed (approve): " + e.getMessage());
        }

        return ResponseEntity.ok(leave);
    }

    // ===================== REJECT LEAVE =====================
    @PostMapping("/reject/{id}")
    public ResponseEntity<?> rejectLeave(@PathVariable Long id) {

        LeaveRequest leave = leaveRepository.findById(id).orElse(null);
        if (leave == null) return ResponseEntity.badRequest().body("Leave not found");

        String previousStatus = leave.getStatus();
        leave.setStatus("REJECTED");
        leave.setAction("REJECTED");
        leaveRepository.save(leave);

        try {
            User student = leave.getUser();
            User teacher = leave.getTeacher();

            String rejectedBy = "Teacher";
            if (previousStatus.equals("PENDING_HOD")) {
                List<User> hods = userRepository.findByRole("HOD");
                rejectedBy = hods.isEmpty() ? "HOD" : hods.get(0).getName();
            } else if (previousStatus.equals("PENDING_DIRECTOR")) {
                List<User> directors = userRepository.findByRole("Director");
                rejectedBy = directors.isEmpty() ? "Director" : directors.get(0).getName();
            } else if (teacher != null) {
                rejectedBy = teacher.getName();
            }

            saveNotif(student, "❌", "#fee2e2",
                    "Leave request rejected by " + rejectedBy,
                    "Your leave application was not approved");

            emailService.sendRejected(
                student.getEmail(), student.getName(),
                rejectedBy, leave.getDays()
            );

        } catch (Exception e) {
            System.out.println("Email failed (reject): " + e.getMessage());
        }

        return ResponseEntity.ok(leave);
    }

    // ===================== CANCEL LEAVE (by student) =====================
    @PatchMapping("/cancel/{id}")
    public ResponseEntity<?> cancelLeave(@PathVariable Long id) {

        LeaveRequest leave = leaveRepository.findById(id).orElse(null);
        if (leave == null) return ResponseEntity.badRequest().body("Leave not found");

        if (!leave.getStatus().equals("PENDING_TEACHER")) {
            return ResponseEntity.badRequest().body("Cannot cancel leave after it has been processed.");
        }

        leave.setStatus("CANCELLED");
        leave.setAction("CANCELLED");
        leaveRepository.save(leave);

        User student = leave.getUser();
        User teacher = leave.getTeacher();

        saveNotif(student, "↩️", "#fef3c7",
                "Leave application cancelled",
                "You cancelled your leave request");
        saveNotif(teacher, "↩️", "#fef3c7",
                (student != null ? student.getName() : "Student") + " cancelled their leave request",
                "The leave request has been withdrawn");

        try {
            if (student != null && teacher != null) {
                emailService.sendLeaveCancelled(
                    student.getEmail(), student.getName(),
                    teacher.getEmail(), teacher.getName(),
                    leave.getDays()
                );
            }
        } catch (Exception e) {
            System.out.println("Email failed (cancel): " + e.getMessage());
        }

        return ResponseEntity.ok(leave);
    }

    // ===================== GET ALL TEACHERS =====================
    @GetMapping("/teachers")
    public List<User> getTeachers() {
        return userRepository.findByRole("Teacher");
    }
}