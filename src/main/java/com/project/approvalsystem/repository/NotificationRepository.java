package com.project.approvalsystem.repository;

import com.project.approvalsystem.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // Get all notifications for a user, newest first
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Count unread notifications for a user
    long countByUserIdAndIsRead(Long userId, boolean isRead);
}