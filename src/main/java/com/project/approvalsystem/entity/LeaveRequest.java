package com.project.approvalsystem.entity;

import jakarta.persistence.*;

@Entity

public class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String reason;

    @Column(nullable = false)
    private int days;

    // Status values:
    // PENDING_TEACHER   → waiting for teacher approval
    // PENDING_HOD       → teacher approved, waiting for HOD (days > 3)
    // APPROVED_BY_TEACHER → final approval (days <= 3)
    // APPROVED_BY_HOD   → final approval (days > 3, HOD approved)
    // REJECTED          → rejected by teacher or HOD
    // CANCELLED         → cancelled by student
    private String status;

    // Action column — tracks what action was last taken
    // Values: APPLIED, CANCELLED, APPROVED, REJECTED
    private String action;


    private String startDate;
    private String endDate;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Getters & Setters

    public Long getId() { return id; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public int getDays() { return days; }
    public void setDays(int days) { this.days = days; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    @ManyToOne
    @JoinColumn(name = "teacher_id")
    private User teacher;

    public User getTeacher() { return teacher; }
    public void setTeacher(User teacher) { this.teacher = teacher; }


    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }


}
