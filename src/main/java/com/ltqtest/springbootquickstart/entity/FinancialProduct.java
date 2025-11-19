package com.ltqtest.springbootquickstart.entity;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "financial_product")
public class FinancialProduct {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "fpId")
    private Integer fpId;
    
    @Column(name = "fpName", nullable = false)
    private String fpName;
    
    @Column(name = "fpDescription", nullable = false)
    private String fpDescription;
    
    @Column(name = "annualRate")
    private Float annualRate;
    
    @Column(name = "tags", nullable = false)
    private String tags;
    
    @Column(name = "fpManagerName", nullable = false)
    private String fpManagerName;
    
    @Column(name = "fpManagerPhone", nullable = false)
    private String fpManagerPhone;
    
    @Column(name = "fpManagerEmail")
    private String fpManagerEmail;
    
    @Column(name = "maxAmount", nullable = false)
    private Integer maxAmount;
    
    @Column(name = "minAmount", nullable = false)
    private Integer minAmount;
    
    @Column(name = "term")
    private Integer term;

    
    
    // 获取标签数组的方法（用于API响应）
    @Transient
    public String[] getTagsArray() {
        if (tags == null || tags.isEmpty()) {
            return new String[0];
        }
        // 标签存储为逗号分隔的字符串
        return tags.split(",");
    }
    
    // 设置标签数组的方法（用于API请求）
    @Transient
    public void setTagsArray(String[] tagsArray) {
        if (tagsArray == null || tagsArray.length == 0) {
            this.tags = "";
        } else {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < tagsArray.length; i++) {
                sb.append(tagsArray[i]);
                if (i < tagsArray.length - 1) {
                    sb.append(",");
                }
            }
            this.tags = sb.toString();
        }
    }
}