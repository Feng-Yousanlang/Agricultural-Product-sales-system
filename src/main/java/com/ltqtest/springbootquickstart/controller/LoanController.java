package com.ltqtest.springbootquickstart.controller;

import java.util.List;
import java.util.Optional;
import java.util.ArrayList;
import com.ltqtest.springbootquickstart.common.Result;
import com.ltqtest.springbootquickstart.entity.FinancialProduct;
import com.ltqtest.springbootquickstart.entity.LoanApplication;
import com.ltqtest.springbootquickstart.entity.ApprovalRecord;
import com.ltqtest.springbootquickstart.entity.RepaymentPlan;
import com.ltqtest.springbootquickstart.entity.RepaymentRecord;
import com.ltqtest.springbootquickstart.entity.LoanStatus;
import com.ltqtest.springbootquickstart.repository.FinancialProductRepository;
import com.ltqtest.springbootquickstart.repository.LoanApplicationRepository;
import com.ltqtest.springbootquickstart.repository.ApprovalRecordRepository;
import com.ltqtest.springbootquickstart.repository.ApproverRepository;
import com.ltqtest.springbootquickstart.repository.RepaymentPlanRepository;
import com.ltqtest.springbootquickstart.repository.RepaymentRecordRepository;
import com.ltqtest.springbootquickstart.repository.LoanStatusRepository;
import org.springframework.format.annotation.DateTimeFormat;
import java.util.Date;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/loan")
public class LoanController {

    @Autowired
    private FinancialProductRepository financialProductRepository;
    
    @Autowired
    private LoanApplicationRepository loanApplicationRepository;
    
    @Autowired
    private ApprovalRecordRepository approvalRecordRepository;
    
    @Autowired
    private ApproverRepository approverRepository;
    
    @Autowired
    private RepaymentPlanRepository repaymentPlanRepository;
    
    @Autowired
    private RepaymentRecordRepository repaymentRecordRepository;
    
    @Autowired
    private LoanStatusRepository loanStatusRepository;
    
    /**
     * 获取贷款产品列表
     * @return 贷款产品列表响应
     */
    @GetMapping("/products")
    public Result<List<FinancialProduct>> getLoanProducts() {
        try {
            // 获取所有贷款产品
            List<FinancialProduct> products = financialProductRepository.findAll();
            
            // 返回成功响应，包含产品列表
            return Result.success(products);
        }catch (Exception e) {
            // 捕获异常，返回错误响应
            return Result.error("获取贷款产品列表失败");
        }
    }
    /**
     * 获取待审批申请列表
     * 接口: /api/loan/pending
     * 返回所有status为"待审批"的申请列表
     */
    @GetMapping("/pending")
    public Result<List<Map<String, Object>>> getPendingLoanApplications() {
        try {
            // 查询状态为1（已提交）的贷款申请
            List<LoanApplication> applications = loanApplicationRepository.findByStatus(1);
            
            // 构建响应数据
            List<Map<String, Object>> resultList = new ArrayList<>();
            for (LoanApplication application : applications) {
                Map<String, Object> applicationMap = new HashMap<>();
                applicationMap.put("applicationId", application.getApplicationId());
                applicationMap.put("userId", application.getUserId());
                
                // 获取产品信息
                Optional<FinancialProduct> productOpt = financialProductRepository.findById(application.getProductId());
                if (productOpt.isPresent()) {
                    applicationMap.put("productName", productOpt.get().getFpName());
                } else {
                    applicationMap.put("productName", "未知产品");
                }
                
                applicationMap.put("amount", application.getAmount());
                applicationMap.put("term", application.getTerm());
                applicationMap.put("applyTime", application.getApplyTime());
                
                resultList.add(applicationMap);
            }
            
            return Result.success(resultList);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error("获取待审批申请列表失败");
        }
    }
     
    
    /**
     * 提交贷款申请
     * POST /api/loan/apply
     */
    @PostMapping("/apply")
    public Result submitLoanApplication(
            @RequestParam(value="userId", required = false) Integer userId,
            @RequestParam(value="productName", required = false) String productName,
            @RequestParam(value="amount", required = false) Integer amount,
            @RequestParam(value="term", required = false) Integer term,
            @RequestParam(value = "documents", required = false) MultipartFile documents[]) {
        try {
            // 验证必填参数
            if (userId == null || productName == null || productName.isEmpty() || amount == null || term == null ) {
                return Result.error("缺少必填参数");
            }
            
            // 根据产品名称查询产品
            FinancialProduct product = financialProductRepository.findByFpName(productName);
            if (product == null) {
                return Result.error("指定的贷款产品不存在");
            }
            
            // 创建贷款申请实体
            LoanApplication application = new LoanApplication();
            application.setUserId(userId);
            application.setProductId(product.getFpId());
            application.setAmount(amount);
            application.setTerm(term);
            application.setStatus(1); // 待审批（对应loan_status表中的1）
            application.setApplyTime(new java.util.Date());
            
            // 处理文件信息
            if (documents != null && documents.length > 0 && !documents[0].isEmpty()) {
                // 文件保存路径设置 - 使用应用根目录下的uploads文件夹
                String uploadDir = System.getProperty("user.dir") + "/uploads/loan_documents/" + userId + "/" + System.currentTimeMillis() + "/";
                File directory = new File(uploadDir);
                
                // 创建目录（如果不存在）
                if (!directory.exists()) {
                    boolean created = directory.mkdirs();
                    if (!created) {
                        throw new RuntimeException("无法创建文件存储目录");
                    }
                }
                
                StringBuilder filePaths = new StringBuilder();
                
                // 遍历并保存每个文件
                for (MultipartFile file : documents) {
                    if (!file.isEmpty()) {
                        try {
                            // 生成唯一文件名，避免文件覆盖
                            String originalFilename = file.getOriginalFilename();
                            String fileExtension = "";
                            if (originalFilename != null && originalFilename.contains(".")) {
                                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
                            }
                            
                            String uniqueFilename = System.currentTimeMillis() + "_" + userId + "_" + productName + fileExtension;
                            String filePath = uploadDir + uniqueFilename;
                            
                            // 保存文件到磁盘
                            File dest = new File(filePath);
                            file.transferTo(dest);
                            
                            // 存储文件路径
                            filePaths.append(filePath).append(",");
                            
                        } catch (IOException e) {
                            throw new RuntimeException("文件保存失败: " + e.getMessage());
                        }
                    }
                }
                
                // 移除最后一个逗号
                if (filePaths.length() > 0) {
                    filePaths.setLength(filePaths.length() - 1);
                }
                
                // 设置文件路径到应用实体
                application.setDocuments(filePaths.toString());
            }
            
            // 保存贷款申请
            LoanApplication savedApplication = loanApplicationRepository.save(application);
            
            // 构建返回数据
            Map<String, Integer> responseData = new HashMap<>();
            responseData.put("applicationId", savedApplication.getApplicationId());
            
            return Result.success(responseData);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error("提交贷款申请失败");
        }
    }
    
    /**
     * 获取用户贷款申请列表
     * @param userId 用户ID
     * @param status 申请状态（可选）
     * @return 贷款申请列表响应
     */
    @GetMapping("/applications")
    public Result<?> getUserLoanApplications(
            @RequestParam Integer userId,
            @RequestParam(required = false) Integer status) {
        try {
            // 验证必填参数
            if (userId == null) {
                return Result.error("缺少用户ID参数");
            }
            
            // 根据是否提供status参数选择不同的查询方法
            List<LoanApplication> applications;
            if (status != null) {
                applications = loanApplicationRepository.findByUserIdAndStatus(userId, status);
            } else {
                applications = loanApplicationRepository.findByUserId(userId);
            }
            
            // 构建响应数据
            List<Map<String, Object>> resultList = new ArrayList<>();
            for (LoanApplication application : applications) {
                Map<String, Object> applicationMap = new HashMap<>();
                applicationMap.put("applicationId", application.getApplicationId());
                
                // 获取产品信息
                Optional<FinancialProduct> productOpt = financialProductRepository.findById(application.getProductId());
                if (productOpt.isPresent()) {
                    applicationMap.put("productName", productOpt.get().getFpName());
                } else {
                    applicationMap.put("productName", "未知产品");
                }
                
                applicationMap.put("status", application.getStatus());
                applicationMap.put("amount", application.getAmount());
                applicationMap.put("term", application.getTerm());
                
                resultList.add(applicationMap);
            }
            
            return Result.success(resultList);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error("获取贷款申请列表失败");
        }
    }
    
    /**
     * 获取单笔贷款申请详情
     * @param id 贷款申请ID
     * @return 贷款申请详情及审批记录
     */
    @GetMapping("/applications/{id}")
    public Result getLoanApplicationDetail(@PathVariable Integer id) {
        try {
            // 查询贷款申请
            Optional<LoanApplication> applicationOpt = loanApplicationRepository.findById(id);
            if (!applicationOpt.isPresent()) {
                return Result.error("贷款申请不存在");
            }
            
            LoanApplication application = applicationOpt.get();
            
            // 构建响应数据
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("applicationId", application.getApplicationId());
            resultMap.put("productId", application.getProductId());
            resultMap.put("amount", application.getAmount());
            resultMap.put("term", application.getTerm());
            resultMap.put("status", application.getStatus());
            
            // 查询审批记录
            List<ApprovalRecord> approvalRecords = approvalRecordRepository.findByApplicationId(id);
            resultMap.put("approvalRecords", approvalRecords);
            
            return Result.success(resultMap);
        } catch (Exception e) {
            return Result.error("获取贷款申请详情失败: " + e.getMessage());
        }
    }
    
    /**
     * 删除贷款产品
     * @param id 产品ID
     * @return 删除结果响应
     */
    @DeleteMapping("/products/{id}")
    public Result<?> deleteLoanProduct(@PathVariable Integer id) {
        try {
            // 检查产品是否存在
            if (!financialProductRepository.existsById(id)) {
                return Result.error("产品不存在");
            }
            
            // 删除产品
            financialProductRepository.deleteById(id);
            
            Result<Object> result = new Result<>();
            result.setCode(200);
            result.setMessage("删除成功");
            return result;
        } catch (Exception e) {
            // 异常处理
            return Result.error("删除产品失败：" + e.getMessage());
        }
    }
    
    /**
     * 根据ID获取单个贷款产品详情
     * @param id 产品ID
     * @return 贷款产品详情响应
     */
    @GetMapping("/products/{id}")
    public Result<FinancialProduct> getLoanProductById(@PathVariable Integer id) {
        try {
            // 查询产品详情
            Optional<FinancialProduct> productOpt = financialProductRepository.findById(id);
            
            // 判断产品是否存在
            if (productOpt.isPresent()) {
                // 产品存在，返回产品详情
                return Result.success(productOpt.get());
            } else {
                // 产品不存在，返回错误信息
                return Result.error("产品不存在");
            }
        } catch (Exception e) {
            // 异常处理
            return Result.error("获取产品详情失败：" + e.getMessage());
        }
    }

    /**
     * 新增贷款产品接口
     * 接口路径: POST /api/loan/products
     */
    @PostMapping("/products")
    public Result<Map<String, Object>> addLoanProduct(@RequestBody Map<String, Object> requestBody) {
        try {
            // 创建金融产品实体
            FinancialProduct product = new FinancialProduct();
            
            // 设置产品属性
            product.setFpName((String) requestBody.get("name"));
            product.setFpDescription((String) requestBody.get("description"));
            product.setAnnualRate(requestBody.get("interestRate") != null ? 
                    Float.valueOf(requestBody.get("interestRate").toString()) : null);
            product.setMaxAmount(requestBody.get("maxAmount") != null ? 
                    Integer.valueOf(requestBody.get("maxAmount").toString()) : null);
            product.setMinAmount(requestBody.get("minAmount") != null ? 
                    Integer.valueOf(requestBody.get("minAmount").toString()) : null);
            
            // 设置标签（使用产品类型作为标签）
            String category = (String) requestBody.get("category");
            product.setTags(category != null ? category : "");
        
            Integer term = null;
            Object termObj = requestBody.get("term");
            if (termObj != null) {
                try {
                    term = Integer.valueOf(termObj.toString());
                    product.setTerm(term);
                } catch (NumberFormatException e) {
                    // 如果格式不正确，返回错误
                    return Result.error(400, "贷款期限格式错误，请输入数字");
                }
            }
            
            // 设置默认的负责人信息（实际项目中应该从请求中获取或从用户会话中获取）
            product.setFpManagerName("1");
            product.setFpManagerPhone("1");
            product.setFpManagerEmail("1");
            
            // 保存产品
            FinancialProduct savedProduct = financialProductRepository.save(product);
            
            // 构建响应数据
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("productId", savedProduct.getFpId());
            
            return Result.success(responseData);
        } catch (Exception e) {
            // 异常处理
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
    
    /**
     * 审批贷款申请
     * 接口: /api/loan/approve
     * 请求方式: POST
     * 参数: applicationId, decision（通过/拒绝）, remark
     */
    @PostMapping("/approve")
    public Result<?> approveLoanApplication(
            @RequestParam Integer applicationId,
            @RequestParam Integer approverId,
            @RequestParam Integer decision,
            @RequestParam String remark) {
        try {
            // 验证必填参数
            if (applicationId == null || approverId == null || decision == null || remark == null || remark.isEmpty()) {
                return Result.error("缺少必填参数");
            }
            
            // 验证审批人是否存在
            if (!approverRepository.existsById(approverId)) {
                return Result.error("审批人不存在");
            }
            
            // 查询贷款申请是否存在
            Optional<LoanApplication> applicationOpt = loanApplicationRepository.findById(applicationId);
            if (!applicationOpt.isPresent()) {
                return Result.error("贷款申请不存在");
            }
            
            LoanApplication application = applicationOpt.get();
            
            // 检查申请状态是否为1（已提交）或3（已审核）
            if (application.getStatus() != 1 && application.getStatus() != 3) {
                return Result.error("该申请已完成审批，无法重复操作");
            }
            
            // 更新贷款申请状态
            if (decision == 1) {
                application.setStatus(3); // 已审核（对应loan_status表中的3）
                // 保存更新后的贷款申请
                loanApplicationRepository.save(application);
                
                // 生成还款计划
                generateRepaymentPlan(application);
            } else if (decision == 0) {
                application.setStatus(2); // 已打回（对应loan_status表中的2）
                // 保存更新后的贷款申请
                loanApplicationRepository.save(application);
            } else {
                return Result.error("无效的审批决定，decision只能是0或1");
            }
            
            // 创建审批记录
            ApprovalRecord approvalRecord = new ApprovalRecord();
            approvalRecord.setApplicationId(applicationId);
            approvalRecord.setApproverId(approverId);
            approvalRecord.setDecision(decision == 1); // true表示通过，false表示拒绝
            approvalRecord.setOpinion(remark);
            approvalRecord.setApprovalTime(new java.util.Date());
            
            // 保存审批记录
            approvalRecordRepository.save(approvalRecord);
            
            // 返回成功响应
            return Result.success(200,null, "审批完成");
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error(500, "审批操作失败: " + e.getMessage());
        }
    }
    
    /**
     * 生成还款计划
     * @param application 已批准的贷款申请
     */
    private void generateRepaymentPlan(LoanApplication application) {
        try {
            Integer applicationId = application.getApplicationId();
            Integer amount = application.getAmount();
            Integer term = application.getTerm();
            
            // 计算每期还款金额（等额本息简单计算，这里简化为平均分配）
            Float monthlyAmount = (float) amount / term;
            
            // 获取当前日期作为起始日期
            java.util.Calendar calendar = java.util.Calendar.getInstance();
            
            // 为每个月生成还款计划
            for (int i = 0; i < term; i++) {
                // 计算还款日（从下个月开始，每月的最后一天）
                calendar.add(java.util.Calendar.MONTH, 1);
                calendar.set(java.util.Calendar.DAY_OF_MONTH, calendar.getActualMaximum(java.util.Calendar.DAY_OF_MONTH));
                
                // 创建还款计划实体
                RepaymentPlan repaymentPlan = new RepaymentPlan();
                repaymentPlan.setApplicationId(applicationId);
                repaymentPlan.setDueDate(calendar.getTime());
                repaymentPlan.setRemainingAmount(monthlyAmount);
                repaymentPlan.setStatus("未还");
                
                // 保存还款计划
                repaymentPlanRepository.save(repaymentPlan);
            }
        } catch (Exception e) {
            e.printStackTrace();
            // 记录日志但不抛出异常，避免影响审批流程
        }
    }
    
    /**
     * 获取审批历史
     * 接口: /api/loan/approvals
     * 请求方式: GET
     * 参数: applicationId
     * 返回: 审批历史列表
     */
    @GetMapping("/approvals")
    public Result<List<Map<String, Object>>> getApprovalHistory(@RequestParam Integer applicationId) {
        try {
            // 验证必填参数
            if (applicationId == null) {
                return Result.error(400, "缺少必填参数applicationId");
            }
            
            // 查询审批记录
            List<ApprovalRecord> approvalRecords = approvalRecordRepository.findByApplicationId(applicationId);
            
            // 构建响应数据
            List<Map<String, Object>> resultList = new ArrayList<>();
            for (ApprovalRecord record : approvalRecords) {
                Map<String, Object> recordMap = new HashMap<>();
                recordMap.put("approverId", record.getApproverId());
                // 将布尔值decision转换为中文文本
                recordMap.put("decision", record.getDecision() ? "通过" : "拒绝");
                recordMap.put("remark", record.getOpinion());

                SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
                // 使用日期对象的默认格式
               if (record.getApprovalTime() != null) {
                recordMap.put("date", dateFormat.format(record.getApprovalTime()));
                 } else { 
                recordMap.put("date", null);
                }
                resultList.add(recordMap);
            }
            
            return Result.success(200, "成功", resultList);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error(500, "获取审批历史失败: " + e.getMessage());
        }
    }
    
    /**
     * 获取还款计划
     * @param applicationId 贷款申请ID
     * @return 还款计划列表响应
     */
    @GetMapping("/repayment-plan")
    public Result<List<Map<String, Object>>> getRepaymentPlan(@RequestParam Integer applicationId) {
        try {
            // 验证参数
            if (applicationId == null || applicationId <= 0) {
                return Result.error(400, "无效的申请ID");
            }
            
            // 查询还款计划
            List<RepaymentPlan> repaymentPlans = repaymentPlanRepository.findByApplicationId(applicationId);
            
            // 检查并更新逾期状态
            checkAndUpdateOverdueStatus(applicationId, repaymentPlans);
            
            // 重新查询更新后的还款计划
            repaymentPlans = repaymentPlanRepository.findByApplicationId(applicationId);
            
            // 转换为需要的格式
            List<Map<String, Object>> resultList = new ArrayList<>();
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
            
            for (RepaymentPlan plan : repaymentPlans) {
                Map<String, Object> planMap = new HashMap<>();
                planMap.put("dueDate", dateFormat.format(plan.getDueDate()));
                planMap.put("RemainingAmout", plan.getRemainingAmount());
                // 根据剩余金额设置状态，符合新的六种贷款状态规范
                if (plan.getRemainingAmount() > 0) {
                    // 检查是否逾期（状态码6）
                    if (plan.getDueDate().before(new Date())) {
                        planMap.put("status", "已逾期"); // 对应状态码6：已逾期
                    } else {
                        planMap.put("status", "未还清"); // 对应状态码4：未还清
                    }
                } else {
                    planMap.put("status", "已还款"); // 对应状态码5：已还款
                }
                resultList.add(planMap);
            }
            
            return Result.success(200, "成功", resultList);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error(500, "系统异常");
        }
    }

    /**
     * 提交还款记录
     */
    @PostMapping("/repay")
    public Result repayLoan(@RequestParam Integer applicationId,
                           @RequestParam Float amount,
                           @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") Date payDate) {
        try {
            // 验证参数
            if (applicationId == null || amount == null || payDate == null || amount <= 0) {
                return Result.error(400, "参数错误");
            }

            // 获取还款计划
            List<RepaymentPlan> repaymentPlans = repaymentPlanRepository.findByApplicationId(applicationId);
            if (repaymentPlans == null || repaymentPlans.isEmpty()) {
                return Result.error(404, "未找到还款计划");
            }
            
            // 计算总剩余还款金额
            double totalRemainingToPay = repaymentPlans.stream()
                    .mapToDouble(RepaymentPlan::getRemainingAmount)
                    .sum();
            
            Float remainingAmount = amount;
            
            // 如果还款金额大于等于总剩余还款金额，将所有未还清的还款计划置为0
            if (amount >= totalRemainingToPay) {
                for (RepaymentPlan plan : repaymentPlans) {
                    if (plan.getRemainingAmount() > 0) {
                        plan.setRemainingAmount(0f);
                        // 使用符合新规范的状态值，已还款对应状态码5
                        plan.setStatus("已还款");
                        repaymentPlanRepository.save(plan);
                    }
                }
                remainingAmount = 0f; // 全部还清，无剩余金额
            } else {
                // 否则按原有逻辑处理部分还款
                // 遍历还款计划，更新剩余金额
                for (RepaymentPlan plan : repaymentPlans) {
                    if (plan.getRemainingAmount() > 0 && remainingAmount > 0) {
                        if (plan.getRemainingAmount() <= remainingAmount) {
                            // 当前分期可以完全还清
                            remainingAmount -= plan.getRemainingAmount();
                            plan.setRemainingAmount(0f);
                            // 使用符合新规范的状态值，已还款对应状态码5
                            plan.setStatus("已还款");
                        } else {
                            // 当前分期部分还款
                            plan.setRemainingAmount(plan.getRemainingAmount() - remainingAmount);
                            remainingAmount = 0f;
                        }
                        repaymentPlanRepository.save(plan);
                    }
                    if (remainingAmount <= 0) {
                        break;
                    }
                }
            }

            // 从贷款申请表中获取用户ID
            Optional<LoanApplication> loanApplicationOpt = loanApplicationRepository.findById(applicationId);
            if (!loanApplicationOpt.isPresent()) {
                return Result.error(404, "贷款申请不存在");
            }
            Integer userId = loanApplicationOpt.get().getUserId();

            // 更新贷款申请状态
            LoanApplication loanApplication = loanApplicationOpt.get();
            if (amount >= totalRemainingToPay) {
                loanApplication.setStatus(5); // 设置为状态码5：已还款
            } else {
                // 检查是否有逾期
                boolean isOverdue = false;
                List<RepaymentPlan> updatedPlans = repaymentPlanRepository.findByApplicationId(applicationId);
                for (RepaymentPlan plan : updatedPlans) {
                    if (plan.getRemainingAmount() > 0 && plan.getDueDate().before(new Date())) {
                        isOverdue = true;
                        break;
                    }
                }
                // 如果有逾期，设置为状态码6：已逾期；否则设置为状态码4：未还清
                loanApplication.setStatus(isOverdue ? 6 : 4);
            }
            loanApplicationRepository.save(loanApplication);

            // 创建还款记录
            RepaymentRecord record = new RepaymentRecord();
            record.setApplicationId(applicationId);
            record.setUserId(userId); // 使用从贷款申请中获取的用户ID
            // 如果还款金额大于实际需要还款金额，将该次还款数记为实际需要还款金额
            if (amount > totalRemainingToPay) {
                record.setAmount((float) totalRemainingToPay);
            } else {
                record.setAmount(amount);
            }
            record.setPayDate(payDate);
            // 根据还款情况设置状态，符合新的六种贷款状态规范
            if (amount >= totalRemainingToPay) {
                record.setStatus("已还款"); // 对应状态码5
            } else {
                // 检查是否有逾期
                boolean isOverdue = false;
                List<RepaymentPlan> updatedPlans = repaymentPlanRepository.findByApplicationId(applicationId);
                for (RepaymentPlan plan : updatedPlans) {
                    if (plan.getRemainingAmount() > 0 && plan.getDueDate().before(new Date())) {
                        isOverdue = true;
                        break;
                    }
                }
                record.setStatus(isOverdue ? "已逾期" : "未还清"); // 根据是否逾期设置状态
            }
            repaymentRecordRepository.save(record);

            // 计算总的剩余还款金额
            List<RepaymentPlan> updatedPlans = repaymentPlanRepository.findByApplicationId(applicationId);
            double planRemaining = 0;
            if (updatedPlans != null) {
                planRemaining = updatedPlans.stream()
                        .mapToDouble(RepaymentPlan::getRemainingAmount)
                        .sum();
            }
            Float totalRemaining = (float) (planRemaining + remainingAmount);

            Map<String, Object> data = new HashMap<>();
            data.put("remainingAmount", totalRemaining);

            return Result.success(200, "还款成功", data);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error(500, "还款失败：" + e.getMessage());
        }
    }

    /**
     * 查看还款历史
     */
    @GetMapping("/repayments")
    public Result getRepaymentHistory(@RequestParam Integer userId) {
        try {
            // 验证参数
            if (userId == null || userId <= 0) {
                return Result.error(400, "用户ID参数错误");
            }

            // 查询用户的所有贷款申请
            List<LoanApplication> loanApplications = loanApplicationRepository.findByUserId(userId);
            
            // 检查并更新所有贷款申请的逾期状态
            for (LoanApplication application : loanApplications) {
                List<RepaymentPlan> plans = repaymentPlanRepository.findByApplicationId(application.getApplicationId());
                checkAndUpdateOverdueStatus(application.getApplicationId(), plans);
            }

            // 查询还款记录
            List<RepaymentRecord> repaymentRecords = repaymentRecordRepository.findByUserId(userId);
            List<Map<String, Object>> resultList = new ArrayList<>();
            SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");

            // 转换为返回格式
            for (RepaymentRecord record : repaymentRecords) {
                Map<String, Object> recordMap = new HashMap<>();
                recordMap.put("applicationId", record.getApplicationId());
                recordMap.put("amount", record.getAmount());
                recordMap.put("payDate", dateFormat.format(record.getPayDate()));
                resultList.add(recordMap);
            }

            return Result.success(200, "成功", resultList);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error(500, "查询还款历史失败：" + e.getMessage());
        }
    }
    
    /**
     * 检查并更新贷款的逾期状态
     * @param applicationId 贷款申请ID
     * @param repaymentPlans 还款计划列表
     */
    private void checkAndUpdateOverdueStatus(Integer applicationId, List<RepaymentPlan> repaymentPlans) {
        try {
            // 获取贷款申请
            Optional<LoanApplication> loanApplicationOpt = loanApplicationRepository.findById(applicationId);
            if (!loanApplicationOpt.isPresent()) {
                return;
            }
            LoanApplication loanApplication = loanApplicationOpt.get();
            
            // 检查是否有未还款且已逾期的计划
            boolean hasOverdue = false;
            for (RepaymentPlan plan : repaymentPlans) {
                if (plan.getRemainingAmount() > 0 && plan.getDueDate().before(new Date())) {
                    hasOverdue = true;
                    // 更新还款计划状态为已逾期
                    plan.setStatus("已逾期");
                    repaymentPlanRepository.save(plan);
                }
            }
            
            // 如果有逾期且当前状态不是已还款，则更新贷款申请状态为已逾期（状态码6）
            if (hasOverdue && loanApplication.getStatus() != 5) {
                loanApplication.setStatus(6); // 已逾期
                loanApplicationRepository.save(loanApplication);
            }
        } catch (Exception e) {
            // 记录异常但不抛出，避免影响主流程
            e.printStackTrace();
        }
    }
    
    // 1. 获取所有贷款状态
    @GetMapping("/status")
    public Result<List<LoanStatus>> getAllLoanStatus() {
        try {
            List<LoanStatus> statusList = loanStatusRepository.findAll();
            return Result.success(200, "成功", statusList);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error(500, "查询贷款状态失败：" + e.getMessage());
        }
    }
    
    // 2. 新增贷款状态
    @PostMapping("/status")
    public Result<Map<String, Object>> addLoanStatus(@RequestBody Map<String, Object> requestBody) {
        try {
            // 获取请求参数
            Integer statusCode = (Integer) requestBody.get("status_code");
            String statusName = (String) requestBody.get("status_name");
            String description = (String) requestBody.get("description");
            
            // 验证必填参数
            if (statusCode == null || statusName == null || statusName.isEmpty()) {
                return Result.error(400, "状态码和状态名称为必填项");
            }
            
            // 检查状态码是否已存在
            if (loanStatusRepository.existsByStatusCode(statusCode)) {
                return Result.error(400, "该状态码已存在");
            }
            
            // 创建新的贷款状态
            LoanStatus loanStatus = new LoanStatus();
            loanStatus.setStatusCode(statusCode);
            loanStatus.setStatusName(statusName);
            loanStatus.setDescription(description);
            
            // 保存到数据库
            LoanStatus savedStatus = loanStatusRepository.save(loanStatus);
            
            // 返回结果
            Map<String, Object> result = new HashMap<>();
            result.put("status_id", savedStatus.getStatusId());
            return Result.success(200, "新增状态成功", result);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error(500, "新增贷款状态失败：" + e.getMessage());
        }
    }
    
    // 3. 修改贷款状态
    @PutMapping("/status/{id}")
    public Result updateLoanStatus(@PathVariable Integer id, @RequestBody Map<String, Object> requestBody) {
        try {
            // 查询状态是否存在
            Optional<LoanStatus> optionalStatus = loanStatusRepository.findById(id);
            if (!optionalStatus.isPresent()) {
                return Result.error(404, "贷款状态不存在");
            }
            
            // 获取现有状态并更新字段
            LoanStatus loanStatus = optionalStatus.get();
            if (requestBody.containsKey("status_name")) {
                String statusName = (String) requestBody.get("status_name");
                loanStatus.setStatusName(statusName);
            }
            if (requestBody.containsKey("description")) {
                String description = (String) requestBody.get("description");
                loanStatus.setDescription(description);
            }
            
            // 保存更新
            loanStatusRepository.save(loanStatus);
            
            return Result.success(200, "更新成功", null);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error(500, "更新贷款状态失败：" + e.getMessage());
        }
    }
    
    // 4. 删除贷款状态
    @DeleteMapping("/status/{id}")
    public Result deleteLoanStatus(@PathVariable Integer id) {
        try {
            // 查询状态是否存在
            if (!loanStatusRepository.existsById(id)) {
                return Result.error(404, "贷款状态不存在");
            }
            
            // 删除状态
            loanStatusRepository.deleteById(id);
            
            return Result.success(200, "删除成功", null);
        } catch (Exception e) {
            e.printStackTrace();
            return Result.error(500, "删除贷款状态失败：" + e.getMessage());
        }
    }
}