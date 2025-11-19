package com.ltqtest.springbootquickstart.repository;

import com.ltqtest.springbootquickstart.entity.ApprovalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ApprovalRecordRepository extends JpaRepository<ApprovalRecord, Integer> {
    
    // 根据贷款申请ID查询审批记录
    List<ApprovalRecord> findByApplicationId(Integer applicationId);
}
