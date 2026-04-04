package com.project.approvalsystem.controller;

import com.project.approvalsystem.entity.Notification;
import com.project.approvalsystem.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    // GET /notifications/user/{userId}  — fetch all notifications for a user
    @GetMapping("/user/{userId}")
    public List<Notification> getNotifications(@PathVariable Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // PATCH /notifications/mark-read/{userId}  — mark all as read for a user
    @PatchMapping("/mark-read/{userId}")
    public ResponseEntity<?> markAllRead(@PathVariable Long userId) {
        List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        list.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(list);
        return ResponseEntity.ok("All marked as read");
    }
}