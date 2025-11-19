package com.ltqtest.springbootquickstart.common;

import lombok.Data;

/**
 * 通用响应类
 */
@Data
public class Result<T> {
    private Integer code;
    private String message;
    private T data;

    public static <T> Result<T> success() {
        return success(null);
    }

    public static <T> Result<T> success(T data) {
        Result<T> result = new Result<>();
        result.setCode(200);
        result.setMessage("操作成功");
        result.setData(data);
        return result;
    }

    public static <T> Result<T> success(Integer code, String message, T data) {
    Result<T> result = new Result<>();
    result.setCode(code);
    result.setMessage(message);
    result.setData(data);
    return result;
}

    public static <T> Result<T> error(String message) {
        return error(500, message);
    }

    public static <T> Result<T> error(Integer code, String message) {
        Result<T> result = new Result<>();
        result.setCode(code);
        result.setMessage(message);
        return result;
    }
}