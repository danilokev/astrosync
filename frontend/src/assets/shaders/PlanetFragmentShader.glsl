#version 300 es

precision highp float;

struct Light {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec3 direction;
};

struct Material {
    vec3 albedo;
    vec3 specular;
    float shininess;
    vec3 emissive;
    float opacity;
};

uniform Light light;
uniform Material material;

uniform sampler2D uTexture;
uniform vec3 uViewPos;

in vec2 vUV;
in vec3 vNormal;
in vec3 vFragPos;

out vec4 fragColor;

void main() {
    vec4 tex = texture(uTexture, vUV);

    vec3 norm = normalize(vNormal);
    vec3 lightDir = normalize(-light.direction);
    vec3 viewDir = normalize(uViewPos - vFragPos);

    // Diffuse
    float diff = max(dot(norm, lightDir), 0.0);

    // Specular
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), max(0.0001, material.shininess));

    vec3 ambient  = light.ambient * tex.rgb * material.albedo;
    vec3 diffuse  = light.diffuse * diff * tex.rgb * material.albedo;
    vec3 specular = light.specular * spec * material.specular;

    vec3 emissive = material.emissive * tex.rgb;

    vec3 result = ambient + diffuse + specular + emissive;

    float alpha = tex.a * material.opacity;
    
    fragColor = vec4(result, alpha);
}