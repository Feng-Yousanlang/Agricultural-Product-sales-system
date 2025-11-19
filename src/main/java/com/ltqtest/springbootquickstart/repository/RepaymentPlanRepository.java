package com.ltqtest.springbootquickstart.repository;

import com.ltqtest.springbootquickstart.entity.RepaymentPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * 还款计划数据访问接口
 */
@Repository
public interface RepaymentPlanRepository extends JpaRepository<RepaymentPlan, Integer> {

    /**
     * 根据贷款申请ID查询还款计划
     * @param applicationId 贷款申请ID
     * @return 还款计划列表
     */
    List<RepaymentPlan> findByApplicationId(Integer applicationId);
}

