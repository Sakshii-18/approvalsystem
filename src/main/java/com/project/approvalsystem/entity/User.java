package com.project.approvalsystem.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    private String password;

    private String role;

    private String className;

    private String department;
     
    @Column(unique=true)
    private String prn;

    private String secretCode;

    public User() {
    }

    public User(String name, String email, String password, String role,
                String className, String prn, String secretCode ,String department ) {
        this.name = name;
        this.email = email;
        this.password = password;
        this.role = role;
        this.className = className;
        this.prn = prn;
        this.secretCode = secretCode;
        this.department= department;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public String getPrn() {
        return prn;
    }

    public void setPrn(String prn) {
        this.prn = prn;
    }

    public String getSecretCode() {
        return secretCode;
    }

    public void setSecretCode(String secretCode) {
        this.secretCode = secretCode;
    }
    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }
}