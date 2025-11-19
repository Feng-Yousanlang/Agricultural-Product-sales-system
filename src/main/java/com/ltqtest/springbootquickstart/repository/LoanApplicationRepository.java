package com.ltqtest.springbootquickstart.repository;

import com.ltqtest.springbootquickstart.entity.LoanApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LoanApplicationRepository extends JpaRepository<LoanApplication, Integer> {
    // 根据用户ID查询贷款申请
    List<LoanApplication> findByUserId(Integer userId);
    
    // 根据用户ID和状态查询贷款申请
    List<LoanApplication> findByUserIdAndStatus(Integer userId, Integer status);
    
    // 根据状态查询贷款申请
    List<LoanApplication> findByStatus(Integer status);
}