package com.project.approvalsystem.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The user who should SEE this notification (student, teacher, hod, director)
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private String message;   // Main text e.g. "Your leave has been approved"
    private String subText;   // Sub text  e.g. "Approved by Teacher"
    private String icon;      // emoji icon e.g. "✅"
    private String iconBg;    // background color e.g. "#dcfce7"

    private boolean isRead = false;

    private LocalDateTime createdAt = LocalDateTime.now();

    // ---- Getters & Setters ----

    public Long getId() { return id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getSubText() { return subText; }
    public void setSubText(String subText) { this.subText = subText; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getIconBg() { return iconBg; }
    public void setIconBg(String iconBg) { this.iconBg = iconBg; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}