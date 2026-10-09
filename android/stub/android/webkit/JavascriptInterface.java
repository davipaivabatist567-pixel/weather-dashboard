// Só para compilar: o android.jar usado (API 16) não tem esta anotação.
// NÃO vai para o .dex; em tempo de execução vale a classe do próprio Android.
package android.webkit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface JavascriptInterface { }
