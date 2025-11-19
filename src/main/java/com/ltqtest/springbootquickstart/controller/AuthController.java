package com.ltqtest.springbootquickstart.controller;

import com.ltqtest.springbootquickstart.common.Result;
import com.ltqtest.springbootquickstart.entity.Approver;
import com.ltqtest.springbootquickstart.entity.Expert;
import com.ltqtest.springbootquickstart.entity.User;
import com.ltqtest.springbootquickstart.repository.ApproverRepository;
import com.ltqtest.springbootquickstart.repository.ExpertRepository;
import com.ltqtest.springbootquickstart.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import lombok.Data;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    // 注册请求参数类
    @Data
    public static class RegisterRequest {
        private String username;
        private String password;
        private String passwordConfirm;
        private String identity; // 1-农户，2-买家，3-专家，4-银行工作人员，5-平台管理员
        private String name; // 用户的名字
    }
    
    // 登录请求参数类
    @Data
    public static class LoginRequest {
        private String username;
        private String password;
    }
    
    // 登录响应数据类
    @Data
    public static class LoginResponse {
        private String token;
        private String identity;
        private String id; // 该用户的信息ID
    }
    
    // 退出登录请求参数类
    @Data
    public static class LogoutRequest {
        private String username;
    }
    
    @Autowired
    private UserService userService;
    
    @Autowired
    private ExpertRepository expertRepository;
    
    @Autowired
    private ApproverRepository approverRepository;
    
   

    /**
     * 接口名称：用户注册接口
     *  接口路径：/api/auth/register
     *  请求方式：POST
     *  接口说明：用于用户注册，申请用户名与密码。
     */
    @PostMapping("/register")
    public Result<?> register(@RequestBody RegisterRequest request) {
        try {
            // 参数校验,看传过来的参数是否完整
            if (request.getUsername() == null || request.getUsername().isEmpty() || 
                request.getPassword() == null || request.getPassword().isEmpty() || 
                request.getPasswordConfirm() == null || request.getPasswordConfirm().isEmpty() ||
                request.getIdentity() == null || request.getIdentity().isEmpty() ||
                request.getName() == null || request.getName().isEmpty()) {
                return Result.error(500, "注册失败");
            }
            
            // 验证两次密码是否一致
            if (!request.getPassword().equals(request.getPasswordConfirm())) {
                return Result.error(300, "两次输入密码不一致");
            }
            
            // 验证身份参数有效性,前端其实已经做了
            Integer roleType;
            try {
                roleType = Integer.parseInt(request.getIdentity());
                if (roleType < 1 || roleType > 5) {
                    return Result.error(500, "注册失败");
                }
            } catch (NumberFormatException e) {
                return Result.error(500, "注册失败");
            }
            
            // 所有用户（包括专家和银行工作人员）都保存到用户表
            // 检查用户名是否已存在
            if (userService.findByUsername(request.getUsername()).isPresent()) {
                return Result.error(400, "该用户名已存在");
            }
            
            // 创建用户对象
            User user = new User();
            user.setUsername(request.getUsername());
            user.setPassword(request.getPassword());
            user.setRoleType(roleType);
            user.setRealName(request.getName()); // 设置用户的名字
            user.setLoginStatus(0); // 注册时设置为未登录状态
            
            // 初始设置expert_id和approver_id为0（适用于普通用户）
            user.setExpertId(0); // expert_id是Integer类型
            user.setApproverId(0); // approver_id是Integer类型
            
            // 调用服务层注册
            User savedUser = userService.register(user);
            
            // 如果是专家(3)，额外创建专家记录并更新用户的expert_id
            if (roleType == 3) {
                Expert expert = new Expert();
                expert.setExpertName(request.getName());
                // 其他字段设置默认值，后续可以通过更新接口补充
                expert.setField("");
                expert.setExpertDescription("");
                expert.setExpertImg("");
                expert.setExample("");
                expert.setExpertPhone("");
                expert.setExpertEmail("");
                // 保存专家记录并获取ID
                Expert savedExpert = expertRepository.save(expert);
                
                // 更新用户记录的expert_id字段
                savedUser.setExpertId(savedExpert.getExpertId()); 
                savedUser.setApproverId(0); 
                userService.update(savedUser);
            }
            
            // 如果是银行工作人员(4)，额外创建审批人记录并更新用户的approver_id
            if (roleType == 4) {
                Approver approver = new Approver();
                approver.setApproverName(request.getName());
                // 其他字段设置默认值，后续可以通过更新接口补充
                approver.setApproverPhone(null);
                approver.setApproverEmail(null);
                // 保存审批人记录并获取ID
                Approver savedApprover = approverRepository.save(approver);
                
                // 更新用户记录的approver_id字段
                savedUser.setApproverId(savedApprover.getApproverId());
                savedUser.setExpertId(0); // 确保expert_id为0
                userService.update(savedUser);
            }
            
            return Result.success(savedUser);
        } catch (Exception e) {
            return Result.error(500, "注册失败");
        }
    }
    
    /**
     * 用户密码登录接口
     * 接口路径：/api/auth/login/pwd
     * 请求方式：POST
     * 功能：验证用户名与密码并返回登录状态和身份信息
     */
    @PostMapping("/login/pwd")
    public Result<?> loginPwd(@RequestBody LoginRequest request) {
        try {
            // 参数校验
            if (request.getUsername() == null || request.getUsername().isEmpty() ||
                request.getPassword() == null || request.getPassword().isEmpty()) {
                return Result.error(400, "参数错误");
            }
            
            // 根据用户名查找用户
            java.util.Optional<User> userOptional = userService.findByUsername(request.getUsername());
            
            // 验证用户是否存在以及密码是否正确
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                // 直接比较明文密码（注意：实际应用中应该加密比较）
                if (request.getPassword().equals(user.getPassword())) {
                    // 登录成功，设置登录状态为1
                    user.setLoginStatus(1);
                    userService.update(user);
                    
                    // 创建响应对象
                LoginResponse response = new LoginResponse();
                response.setToken("1"); // 1为成功
                response.setIdentity(String.valueOf(user.getRoleType())); // 向前端传输身份信息
                
                // 根据用户的expert_id和approver_id字段值返回相应的ID
                String idToReturn;
                // expertId和approverId都是Integer类型
                Integer expertId = user.getExpertId();
                Integer approverId = user.getApproverId();
                
                // 如果expert_id不为null且不为0，返回expert_id
                if (expertId != null && expertId != 0) {
                    idToReturn = String.valueOf(expertId);
                } 
                // 如果approver_id不为0，返回approver_id
                else if (approverId != null && approverId != 0) {
                    idToReturn = String.valueOf(approverId);
                } 
                // 否则返回用户的userId
                else {
                    idToReturn = String.valueOf(user.getUserId());
                }
                
                response.setId(idToReturn);
                
                return Result.success(response);
                }
            }
            
            // 用户名或密码错误
            return Result.error(401, "用户名或密码错误");
        } catch (Exception e) {
            // 服务器内部错误
            return Result.error(500, "服务器内部错误");
        }
    }
    
    /**
     * 接口名称：用户退出登录接口
     * 接口路径：/api/auth/logout
     * 请求方式：POST
     * 接口说明：用于用户退出登录。
     */
    @PostMapping("/logout")
    public Result<String> logout(@RequestBody LogoutRequest request) {
        try {
            // 参数校验
            if (request.getUsername() == null || request.getUsername().isEmpty()) {
                return Result.error(400, "参数错误");
            }
            
            // 根据用户名查找用户
            java.util.Optional<User> userOptional = userService.findByUsername(request.getUsername());
            
            // 验证用户是否存在
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                // 设置登录状态为0（未登录）
                user.setLoginStatus(0);
                userService.update(user);
                return Result.success(null);
            } else {
                // 用户不存在
                return Result.error(300, "用户不存在");
            }
        } catch (Exception e) {
            // 服务器内部错误
            return Result.error(500, "服务器内部错误");
        }
    }
}