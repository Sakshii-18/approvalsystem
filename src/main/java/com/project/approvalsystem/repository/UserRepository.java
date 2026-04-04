package com.project.approvalsystem.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.project.approvalsystem.entity.User;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {

    User findByEmail(String email);

    User findByPrn(String prn);

    List<User> findByRole(String role);

}