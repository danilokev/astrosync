#version 300 es

precision highp float;

struct Light {
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    vec3 direction;
};

uniform Light light;
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

    // Diffuse
    float diff = max(dot(norm, lightDir), 0.0);

    // Specular
    vec3 viewDir = normalize(uViewPos - vFragPos);
    vec3 reflectDir = reflect(-lightDir, norm);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);

    vec3 ambient  = light.ambient * tex.rgb;
    vec3 diffuse  = light.diffuse * diff * tex.rgb;
    vec3 specular = light.specular * spec;

    vec3 result = ambient + diffuse + specular;

    fragColor = vec4(result, tex.a);
}