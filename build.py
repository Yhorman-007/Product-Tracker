import os

def generate_compendium():
    output_file = "compendio_tecnico_completo.txt"
    directories_to_scan = ["backend", "product-tracker"]
    
    # Archivos y extensiones a incluir
    included_extensions = {".py", ".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".md", ".json"}
    
    # Directorios a ignorar
    ignored_dirs = {"venv", "node_modules", ".git", ".venv", ".vscode", "__pycache__", "dist", "build"}
    
    with open(output_file, "w", encoding="utf-8") as outfile:
        outfile.write("COMPENDIO TÉCNICO COMPLETO\n")
        outfile.write("==========================\n\n")
        
        for directory in directories_to_scan:
            if not os.path.exists(directory):
                continue
                
            for root, dirs, files in os.walk(directory):
                # Filtrar directorios ignorados en su lugar para no recorrerlos
                dirs[:] = [d for d in dirs if d not in ignored_dirs and not d.startswith('.')]
                
                for file in files:
                    if file.endswith('.svg') or file.endswith('.png') or file.endswith('.jpg'):
                        continue
                        
                    ext = os.path.splitext(file)[1]
                    if ext in included_extensions or file in ["Dockerfile", "docker-compose.yml", ".env.example", ".gitignore"]:
                        filepath = os.path.join(root, file)
                        try:
                            with open(filepath, "r", encoding="utf-8") as f:
                                content = f.read()
                                outfile.write(f"\n\n{'='*80}\n")
                                outfile.write(f"Archivo: {filepath}\n")
                                outfile.write(f"{'='*80}\n\n")
                                outfile.write(content)
                        except Exception as e:
                            outfile.write(f"\n\n[Error leyendo el archivo {filepath}: {e}]\n")
                            
    print(f"✅ Compendio generado exitosamente en: {os.path.abspath(output_file)}")

if __name__ == "__main__":
    generate_compendium()
