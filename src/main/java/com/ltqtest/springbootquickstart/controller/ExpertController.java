package com.ltqtest.springbootquickstart.controller;

import com.ltqtest.springbootquickstart.common.Result;
import com.ltqtest.springbootquickstart.entity.Expert;
import com.ltqtest.springbootquickstart.entity.ExpertAppointment;
import com.ltqtest.springbootquickstart.entity.User;
import com.ltqtest.springbootquickstart.repository.ExpertRepository;
import com.ltqtest.springbootquickstart.repository.ExpertAppointmentRepository;
import com.ltqtest.springbootquickstart.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api")
public class ExpertController {

    @Autowired
    private ExpertRepository expertRepository;
    
    @Autowired
    private ExpertAppointmentRepository expertAppointmentRepository;
    
    @Autowired
    private UserRepository userRepository;

    /**
     * 获取所有专家接口
     */
    @GetMapping("/experts/")
    public Result<Map<String, Object>> getExperts() {
        try {
            // 查询所有专家
            List<Expert> experts = expertRepository.findAll();
            
            // 转换数据格式，将field字符串转为数组
            List<Map<String, Object>> expertList = new ArrayList<>();
            for (Expert expert : experts) {
                Map<String, Object> expertMap = new HashMap<>();
                expertMap.put("expertId", expert.getExpertId());
                expertMap.put("name", expert.getExpertName());
                expertMap.put("field", expert.getField());
                expertMap.put("expertDescription", expert.getExpertDescription());
                expertList.add(expertMap);
            }
            
            // 构建响应数据
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("experts", expertList);
            
            return Result.success(200, "获取专家列表成功", responseData);
        } catch (Exception e) {
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
    
    /**
     * 创建专家预约申请接口
     * 接口路径: POST /api/expert-appointment/create
     */
    @PostMapping("/expert-appointment/create")
    public Result<Map<String, Object>> createExpertAppointment(@RequestBody Map<String, Object> request) {
        try {
            // 参数校验
            if (request == null) {
                return Result.error(400, "请求参数不能为空");
            }
            
            // 验证必填参数 - 同时支持下划线和驼峰命名格式
            if ((!request.containsKey("expertName") && !request.containsKey("expert_name")) || 
                (request.containsKey("expertName") ? request.get("expertName") == null : request.get("expert_name") == null)) {
                return Result.error(400, "参数错误：专家名称不能为空");
            }
            if ((!request.containsKey("user_id") && !request.containsKey("userId")) || 
                (request.containsKey("user_id") ? request.get("user_id") == null : request.get("userId") == null)) {
                return Result.error(400, "参数错误：用户ID不能为空");
            }
            if (!request.containsKey("date") || request.get("date") == null) {
                return Result.error(400, "参数错误：预约日期不能为空");
            }
            if (!request.containsKey("time") || request.get("time") == null) {
                return Result.error(400, "参数错误：预约时间不能为空");
            }
            
            // 解析参数 - 同时支持下划线和驼峰命名格式
            String expertName;
            Integer userId;
            try {
                // 优先使用驼峰格式，如果不存在则使用下划线格式
                expertName = request.containsKey("expertName") ? request.get("expertName").toString() : request.get("expert_name").toString();
                String userIdStr = request.containsKey("user_id") ? request.get("user_id").toString() : request.get("userId").toString();
                userId = Integer.parseInt(userIdStr);
            } catch (NumberFormatException e) {
                return Result.error(400, "参数错误：用户ID格式不正确");
            }
            
            String dateStr = request.get("date").toString();
            String time = request.get("time").toString();
            String topic = request.containsKey("topic") ? request.get("topic").toString() : null;
            String remark = request.containsKey("remark") ? request.get("remark").toString() : null;
            
            // 验证日期格式
            java.time.LocalDate date;
            try {
                date = java.time.LocalDate.parse(dateStr);
            } catch (Exception e) {
                return Result.error(400, "参数错误：日期格式不正确，请使用YYYY-MM-DD格式");
            }
            
            // 验证预约时间是否大于当前时间
            java.time.LocalDate currentDate = java.time.LocalDate.now();
            java.time.LocalTime currentTime = java.time.LocalTime.now();
            
            // 如果预约日期小于当前日期，直接返回错误
            if (date.isBefore(currentDate)) {
                return Result.error(400, "参数错误：预约日期不能早于当前日期");
            }
            
            // 如果预约日期等于当前日期，则需要比较时间
            if (date.isEqual(currentDate)) {
                try {
                    // 假设时间格式为"HH:mm"，如"14:30"
                    java.time.LocalTime appointmentTime = java.time.LocalTime.parse(time);
                    if (appointmentTime.isBefore(currentTime)) {
                        return Result.error(400, "参数错误：预约时间不能早于当前时间");
                    }
                } catch (Exception e) {
                    return Result.error(400, "参数错误：时间格式不正确，请使用HH:mm格式");
                }
            }
            
            // 根据专家名称查询专家
            Expert expert = expertRepository.findByExpertName(expertName)
                .orElseThrow(() -> new RuntimeException("专家不存在"));
            Integer expertId = expert.getExpertId();
            
            // 创建预约记录
            ExpertAppointment appointment = new ExpertAppointment();
            appointment.setExpertId(expertId);
            appointment.setUserId(userId);
            appointment.setDate(date);
            appointment.setTime(time);
            appointment.setTopic(topic);
            appointment.setRemark(remark);
            
            // 保存到数据库
            ExpertAppointment savedAppointment = expertAppointmentRepository.save(appointment);
            
            // 构建响应数据
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("appointment_id", savedAppointment.getAppointmentId());
            responseData.put("status", "pending");
            
            return Result.success(200, "预约申请已提交，等待专家确认", responseData);
            
        } catch (RuntimeException e) {
            if (e.getMessage().contains("专家不存在")) {
                return Result.error(404, e.getMessage());
            }
            // 检查是否是唯一索引冲突（同一专家在同一时间段被重复预约）
            if (e.getMessage() != null && e.getMessage().contains("uk_expert_date_time")) {
                return Result.error(409, "该专家在该时间段已被预约，请选择其他时间");
            }
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
    
    /**
     * 搜索专家接口
     * 接口路径: GET /api/experts/search
     */
    @GetMapping("/experts/search")
    public Result<Map<String, Object>> searchExperts(@RequestParam("q") String keyword) {
         
        try {

            // 参数校验
            if (keyword == null || keyword.trim().isEmpty()) {
                return Result.error(400, "参数错误：搜索关键词不能为空");
            }
            
            // 执行搜索（使用同一个关键词搜索姓名、专业领域和简介）
            List<Expert> experts = expertRepository.findByExpertNameContainingOrFieldContainingOrExpertDescriptionContaining(
                    keyword, keyword, keyword);
            
            // 转换数据格式，将field字符串转为数组
            List<Map<String, Object>> expertList = new ArrayList<>();
            for (Expert expert : experts) {
                Map<String, Object> expertMap = new HashMap<>();
                expertMap.put("expertId", expert.getExpertId());
                expertMap.put("name", expert.getExpertName());
                expertMap.put("field", expert.getField());
                expertMap.put("expertDescription", expert.getExpertDescription());
                expertList.add(expertMap);
            }
            
            // 构建响应数据
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("experts", expertList);
            return Result.success(200, "搜索专家成功", responseData);
        } catch (Exception e) {
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
    
    /**
     * 获取专家详情接口
     */
    @GetMapping("/experts/{expertId}")
    public Result<Map<String, Object>> getExpertDetail(@PathVariable Integer expertId) {
        try {
            // 验证参数
            if (expertId == null || expertId <= 0) {
                return Result.error(400, "参数错误：专家ID无效");
            }
            
            // 查询专家
            Expert expert = expertRepository.findById(expertId)
                    .orElseThrow(() -> new RuntimeException("专家不存在"));
            
            // 构建响应数据
            Map<String, Object> expertMap = new HashMap<>();
            expertMap.put("expertId", expert.getExpertId());
            expertMap.put("name", expert.getExpertName());
            expertMap.put("field", expert.getField());
            expertMap.put("expertDescription", expert.getExpertDescription());
            expertMap.put("expertImg", expert.getExpertImg());
            expertMap.put("example", expert.getExample());
            expertMap.put("expertPhone", expert.getExpertPhone());
            expertMap.put("expertEmail", expert.getExpertEmail());
            
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("experts", Collections.singletonList(expertMap));
            
            return Result.success(200, "获取专家详情成功", responseData);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("不存在")) {
                return Result.error(404, "资源丢失：专家不存在");
            }
            return Result.error(400, "参数错误：" + e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
    
    /**
     * 用户查看自己发起的所有预约接口
     * 接口路径: GET /api/expert-appointment/user/list
     */
    @GetMapping("/expert-appointment/user/list")
    public Result<List<Map<String, Object>>> getUserAppointments(@RequestParam("user_id") Integer userId) {
        try {
            // 参数校验
            if (userId == null || userId <= 0) {
                return Result.error(400, "参数错误：用户ID无效");
            }
            
            // 查询用户的所有预约记录
            List<ExpertAppointment> appointments = expertAppointmentRepository.findByUserId(userId);
            
            // 转换数据格式
            List<Map<String, Object>> appointmentList = new ArrayList<>();
            for (ExpertAppointment appointment : appointments) {
                Map<String, Object> appointmentMap = new HashMap<>();
                
                // 添加预约基本信息
                appointmentMap.put("id", appointment.getAppointmentId());
                appointmentMap.put("date", appointment.getDate().toString());
                appointmentMap.put("time", appointment.getTime());
                appointmentMap.put("topic", appointment.getTopic());
                appointmentMap.put("status", appointment.getStatus());
                
                // 添加专家信息
                Expert expert = appointment.getExpert();
                if (expert != null) {
                    Map<String, Object> expertMap = new HashMap<>();
                    expertMap.put("id", expert.getExpertId());
                    expertMap.put("name", expert.getExpertName());
                    expertMap.put("expertImg", expert.getExpertImg());
                    expertMap.put("field", expert.getField()); // 注意这里返回原始的逗号分隔字符串
                    appointmentMap.put("expert", expertMap);
                }
                
                appointmentList.add(appointmentMap);
            }
            
            return Result.success(200, "获取预约记录成功", appointmentList);
        } catch (Exception e) {
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
    
    /**
     * 用户取消预约接口
     * 接口路径: POST /api/expert-appointment/cancel
     */
    @PostMapping("/expert-appointment/cancel")
    public Result<Map<String, Object>> cancelAppointment(@RequestBody Map<String, Object> request) {
        try {
            // 参数校验
            if (request == null) {
                return Result.error(400, "请求参数不能为空");
            }
            
            // 验证必填参数 - 同时支持下划线和驼峰命名格式
            if ((!request.containsKey("expertName") && !request.containsKey("expert_name")) || 
                (request.containsKey("expertName") ? request.get("expertName") == null : request.get("expert_name") == null)) {
                return Result.error(400, "参数错误：专家名称不能为空");
            }
            if ((!request.containsKey("user_id") && !request.containsKey("userId")) || 
                (request.containsKey("user_id") ? request.get("user_id") == null : request.get("userId") == null)) {
                return Result.error(400, "参数错误：用户ID不能为空");
            }
            if (!request.containsKey("date") || request.get("date") == null) {
                return Result.error(400, "参数错误：预约日期不能为空");
            }
            if (!request.containsKey("time") || request.get("time") == null) {
                return Result.error(400, "参数错误：预约时间不能为空");
            }
            
            // 解析参数
            String expertName = request.containsKey("expertName") ? request.get("expertName").toString() : request.get("expert_name").toString();
            Integer userId;
            LocalDate date;
            String time = request.get("time").toString();
            
            try {
                userId = Integer.parseInt(request.containsKey("user_id") ? request.get("user_id").toString() : request.get("userId").toString());
                date = LocalDate.parse(request.get("date").toString());
            } catch (NumberFormatException e) {
                return Result.error(400, "参数错误：用户ID格式不正确");
            } catch (Exception e) {
                return Result.error(400, "参数错误：日期格式不正确，请使用YYYY-MM-DD格式");
            }
            
            // 查询专家
            Expert expert = expertRepository.findByExpertName(expertName)
                    .orElseThrow(() -> new RuntimeException("专家不存在"));
            Integer expertId = expert.getExpertId();
            
            // 查询预约记录
            ExpertAppointment appointment = expertAppointmentRepository.findByExpertIdAndUserIdAndDateAndTime(expertId, userId, date, time)
                    .orElseThrow(() -> new RuntimeException("预约记录不存在"));
            
            // 检查预约是否可以取消（未开始的预约）
            LocalDate today = LocalDate.now();
            LocalDate appointmentDate = appointment.getDate();
            
            if (appointmentDate.isBefore(today)) {
                return Result.error(400, "该预约已过期，无法取消");
            }
            
            // 检查预约状态
            if ("cancelled".equals(appointment.getStatus())) {
                return Result.error(400, "该预约已经被取消");
            }
            
            if ("completed".equals(appointment.getStatus())) {
                return Result.error(400, "该预约已完成，无法取消");
            }
            
            // 更新预约状态为取消
            appointment.setStatus("cancelled");
            expertAppointmentRepository.save(appointment);
            
            return Result.success(200, "预约已取消", null);
        } catch (RuntimeException e) {
            if (e.getMessage().contains("专家不存在")) {
                return Result.error(404, "专家不存在");
            }
            if (e.getMessage().contains("预约记录不存在")) {
                return Result.error(404, "预约记录不存在");
            }
            return Result.error(400, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
    
    /**
     * 获取待审核预约列表接口
     * 接口路径: GET /api/expert-appointment/pending
     */
    @GetMapping("/expert-appointment/pending")
    public Result<List<Map<String, Object>>> getPendingAppointments(
            @RequestParam("expert_id") Integer expertId,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size) {
        try {
            // 参数校验
            if (expertId == null || expertId <= 0) {
                return Result.error(400, "参数错误：专家ID无效");
            }
            
            if (page < 1 || size < 1 || size > 100) {
                return Result.error(400, "参数错误：分页参数无效");
            }
            
            // 验证专家是否存在
            if (!expertRepository.existsById(expertId)) {
                return Result.error(404, "专家不存在");
            }
            
            // 创建分页请求
            org.springframework.data.domain.PageRequest pageRequest = 
                    org.springframework.data.domain.PageRequest.of(page - 1, size);
            
            // 查询待审核的预约记录
            org.springframework.data.domain.Page<ExpertAppointment> appointmentPage = 
                    expertAppointmentRepository.findByExpertIdAndStatus(expertId, "pending", pageRequest);
            
            // 转换数据格式
            List<Map<String, Object>> appointmentList = new ArrayList<>();
            for (ExpertAppointment appointment : appointmentPage.getContent()) {
                Map<String, Object> appointmentMap = new HashMap<>();
                
                // 添加预约基本信息
                appointmentMap.put("id", appointment.getAppointmentId());
                appointmentMap.put("date", appointment.getDate().toString());
                appointmentMap.put("time", appointment.getTime());
                appointmentMap.put("topic", appointment.getTopic());
                appointmentMap.put("remark", appointment.getRemark());
                appointmentMap.put("status", appointment.getStatus());
                
                // 添加用户信息
                // 通过用户ID查询用户信息
                User user = userRepository.findByUserId(Long.valueOf(appointment.getUserId())).orElse(null);
                if (user != null) {
                    Map<String, Object> userMap = new HashMap<>();
                    userMap.put("id", user.getUserId());
                    userMap.put("name", user.getRealName() != null ? user.getRealName() : user.getUsername());
                    userMap.put("avatar", user.getImageUrl() != null ? user.getImageUrl() : "https://example.com/u1.jpg");
                    appointmentMap.put("user", userMap);
                } else {
                    // 如果用户不存在，仍然返回基本信息，但用户名为空
                    Map<String, Object> userMap = new HashMap<>();
                    userMap.put("id", appointment.getUserId());
                    userMap.put("name", "未知用户");
                    userMap.put("avatar", "https://example.com/u1.jpg");
                    appointmentMap.put("user", userMap);
                }
                
                appointmentList.add(appointmentMap);
            }
            
            // 直接返回数据数组，符合接口规范
            return Result.success(200, "获取待审核预约列表成功", appointmentList);
        } catch (Exception e) {
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
    
    /**
     * 审批预约接口
     * 接口路径: POST /api/expert-appointment/review
     */
    @PostMapping("/expert-appointment/review")
    public Result<Map<String, Object>> reviewAppointment(@RequestBody Map<String, Object> request) {
        try {
            // 参数校验
            if (request == null) {
                return Result.error(400, "请求参数不能为空");
            }
            
            // 验证必填参数
            if (!request.containsKey("appointment_id") || request.get("appointment_id") == null) {
                return Result.error(400, "参数错误：预约ID不能为空");
            }
            if (!request.containsKey("expert_id") || request.get("expert_id") == null) {
                return Result.error(400, "参数错误：专家ID不能为空");
            }
            if (!request.containsKey("action") || request.get("action") == null) {
                return Result.error(400, "参数错误：审批操作不能为空");
            }
            
            // 解析参数
            Long appointmentId;
            Integer expertId;
            Integer action;
            try {
                appointmentId = Long.parseLong(request.get("appointment_id").toString());
                expertId = Integer.parseInt(request.get("expert_id").toString());
                action = Integer.parseInt(request.get("action").toString());
            } catch (NumberFormatException e) {
                return Result.error(400, "参数错误：预约ID、专家ID或操作类型格式不正确");
            }
            
            // 验证action值是否有效
            if (action != 0 && action != 1) {
                return Result.error(400, "参数错误：审批操作类型无效，应为0（拒绝）或1（同意）");
            }
            
            // 获取可选的comment参数
            String comment = request.containsKey("comment") ? request.get("comment").toString() : null;
            
            // 验证专家是否存在
            if (!expertRepository.existsById(expertId)) {
                return Result.error(404, "专家不存在");
            }
            
            // 查询预约记录
            ExpertAppointment appointment = expertAppointmentRepository.findById(appointmentId)
                    .orElseThrow(() -> new RuntimeException("预约记录不存在"));
            
            // 验证预约是否属于该专家
            if (!appointment.getExpertId().equals(expertId)) {
                return Result.error(403, "无权审批该预约");
            }
            
            // 验证预约是否可以被审批（状态必须为pending）
            if (!"pending".equals(appointment.getStatus())) {
                return Result.error(400, "该预约已经被处理过，无法重复审批");
            }
            
            // 更新预约状态
            if (action == 1) {
                appointment.setStatus("approved"); // 同意预约
            } else {
                appointment.setStatus("rejected"); // 拒绝预约
            }
            
            // 如果有审批备注，保存备注
            if (comment != null) {
                appointment.setComment(comment);
            }
            
            // 保存更新
            expertAppointmentRepository.save(appointment);
            
            // 构建响应数据
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("appointment_id", appointment.getAppointmentId());
            responseData.put("status", appointment.getStatus());
            
            return Result.success(200, "预约已审批", responseData);
            
        } catch (RuntimeException e) {
            if (e.getMessage().contains("不存在")) {
                return Result.error(404, e.getMessage());
            }
            return Result.error(400, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
    
    /**
     * 更新预约状态接口
     * 接口路径: POST /api/expert-appointment/update-status
     */
    @PostMapping("/expert-appointment/update-status")
    public Result<Void> updateAppointmentStatus(@RequestBody Map<String, Object> request) {
        try {
            // 参数校验
            if (request == null) {
                return Result.error(400, "请求参数不能为空");
            }
            
            // 验证必填参数
            if (!request.containsKey("appointment_id") || request.get("appointment_id") == null) {
                return Result.error(400, "参数错误：预约ID不能为空");
            }
            if (!request.containsKey("expert_id") || request.get("expert_id") == null) {
                return Result.error(400, "参数错误：专家ID不能为空");
            }
            if (!request.containsKey("status") || request.get("status") == null) {
                return Result.error(400, "参数错误：状态不能为空");
            }
            
            // 解析参数
            Long appointmentId;
            Integer expertId;
            try {
                appointmentId = Long.parseLong(request.get("appointment_id").toString());
                expertId = Integer.parseInt(request.get("expert_id").toString());
            } catch (NumberFormatException e) {
                return Result.error(400, "参数错误：预约ID或专家ID格式不正确");
            }
            
            String status = request.get("status").toString();
            String report = request.containsKey("report") ? request.get("report").toString() : null;
            
            // 验证status值是否有效
            if (!"completed".equals(status) && !"no_show".equals(status)) {
                return Result.error(400, "参数错误：状态值无效，应为completed或no_show");
            }
            
            // 验证专家是否存在
            if (!expertRepository.existsById(expertId)) {
                return Result.error(404, "专家不存在");
            }
            
            // 查询预约记录
            ExpertAppointment appointment = expertAppointmentRepository.findById(appointmentId)
                    .orElseThrow(() -> new RuntimeException("预约记录不存在"));
            
            // 验证预约是否属于该专家
            if (!appointment.getExpertId().equals(expertId)) {
                return Result.error(403, "无权更新该预约状态");
            }
            
            // 验证状态转换的合法性（只有approved状态才能转为completed或no_show）
            if (!"approved".equals(appointment.getStatus())) {
                return Result.error(400, "只有已批准(approved)的预约才能更新为完成或未出席状态");
            }
            
            // 更新预约状态
            appointment.setStatus(status);
            
            // 如果有报告，保存报告
            if (report != null) {
                appointment.setReport(report);
            }
            
            // 保存更新
            expertAppointmentRepository.save(appointment);
            
            return Result.success(200, "状态已更新为 " + status, null);
            
        } catch (RuntimeException e) {
            if (e.getMessage().contains("不存在")) {
                return Result.error(404, e.getMessage());
            }
            return Result.error(400, e.getMessage());
        } catch (Exception e) {
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
    
    /**
     * 查看预约日程接口
     * 接口路径: GET /api/expert-appointment/schedule
     */
    @GetMapping("/expert-appointment/schedule")
    public Result<List<Map<String, Object>>> getAppointmentSchedule(
            @RequestParam("expert_id") Integer expertId,
            @RequestParam(required = false) String date) {
        try {
            // 参数校验
            if (expertId == null || expertId <= 0) {
                return Result.error(400, "参数错误：专家ID无效");
            }
            
            // 验证专家是否存在
            if (!expertRepository.existsById(expertId)) {
                return Result.error(404, "专家不存在");
            }
            
            // 查询预约记录
            List<ExpertAppointment> appointments;
            if (date != null && !date.trim().isEmpty()) {
                // 验证日期格式
                LocalDate targetDate;
                try {
                    targetDate = LocalDate.parse(date);
                } catch (Exception e) {
                    return Result.error(400, "参数错误：日期格式不正确，请使用YYYY-MM-DD格式");
                }
                // 根据专家ID、日期和状态筛选
                appointments = expertAppointmentRepository.findByExpertIdAndDateAndStatusIn(
                        expertId, targetDate, Arrays.asList("approved", "completed", "no_show"));
            } else {
                // 只根据专家ID和状态筛选
                appointments = expertAppointmentRepository.findByExpertIdAndStatusIn(
                        expertId, Arrays.asList("approved", "completed", "no_show"));
            }
            
            // 转换数据格式
            List<Map<String, Object>> appointmentList = new ArrayList<>();
            for (ExpertAppointment appointment : appointments) {
                Map<String, Object> appointmentMap = new HashMap<>();
                
                // 添加预约基本信息
                appointmentMap.put("id", appointment.getAppointmentId());
                appointmentMap.put("date", appointment.getDate().toString());
                appointmentMap.put("time", appointment.getTime());
                appointmentMap.put("topic", appointment.getTopic());
                appointmentMap.put("status", appointment.getStatus());
                
                // 添加用户信息（用户名）
                User user = userRepository.findByUserId(Long.valueOf(appointment.getUserId())).orElse(null);
                String userName = "未知用户";
                if (user != null) {
                    userName = user.getRealName() != null ? user.getRealName() : user.getUsername();
                }
                appointmentMap.put("user_name", userName);
                
                appointmentList.add(appointmentMap);
            }
            
            // 构建响应数据
            return Result.success(200, "获取预约日程成功", appointmentList);
        } catch (Exception e) {
            return Result.error(500, "服务器内部错误：" + e.getMessage());
        }
    }
}