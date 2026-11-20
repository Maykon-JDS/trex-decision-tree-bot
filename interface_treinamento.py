"""Interface local para importar CSVs e visualizar a árvore treinada."""

import csv
import os
from pathlib import Path
import queue
import subprocess
import sys
import threading
import tkinter as tk
import webbrowser
from tkinter import filedialog, messagebox, ttk
from datetime import datetime


BASE_DIR = Path(__file__).resolve().parent


class TrainingApp:
    def __init__(self, root):
        self.root = root
        self.paths = []
        self.output_dir = None
        self.original_image = None
        self.image = None
        self.scale = 1.0
        self.events = queue.Queue()
        self.process = None
        self.running = False
        root.title("T-Rex • Treinar árvore de decisão")
        root.geometry("1120x800")
        root.minsize(850, 600)
        root.protocol("WM_DELETE_WINDOW", self.close)
        style = ttk.Style(root)
        style.theme_use("clam")
        style.configure("Title.TLabel", font=("Segoe UI", 21, "bold"))
        style.configure("TButton", padding=(12, 7))

        main = ttk.Frame(root, padding=20)
        main.pack(fill="both", expand=True)
        ttk.Label(main, text="Treine sua árvore de decisão", style="Title.TLabel").pack(anchor="w")
        ttk.Label(main, text="Importe os dados do jogo e veja as decisões com ações run, duck ou jump.").pack(anchor="w", pady=(4, 14))

        controls = ttk.Frame(main)
        controls.pack(fill="x")
        self.import_button = ttk.Button(controls, text="Importar CSV…", command=self.choose_files)
        self.import_button.pack(side="left")
        ttk.Label(controls, text="Profundidade máxima:").pack(side="left", padx=(20, 8))
        self.depth = tk.StringVar(value="16")
        self.depth_input = ttk.Spinbox(controls, from_=1, to=24, width=4, textvariable=self.depth)
        self.depth_input.pack(side="left")
        self.train_button = ttk.Button(controls, text="Treinar e desenhar árvore", command=self.start_training, state="disabled")
        self.train_button.pack(side="left", padx=16)
        ttk.Button(controls, text="Abrir jogo", command=lambda: webbrowser.open((BASE_DIR / "index.html").as_uri())).pack(side="right")
        self.file_label = ttk.Label(main, text="Nenhum CSV selecionado.", wraplength=1000)
        self.file_label.pack(anchor="w", pady=12)

        self.notebook = ttk.Notebook(main)
        self.notebook.pack(fill="both", expand=True)
        preview_tab = ttk.Frame(self.notebook)
        tree_tab = ttk.Frame(self.notebook)
        report_tab = ttk.Frame(self.notebook)
        self.notebook.add(preview_tab, text="Prévia do CSV")
        self.notebook.add(tree_tab, text="Árvore de decisão")
        self.notebook.add(report_tab, text="Relatório")
        self.tree_tab = tree_tab

        self.preview = ttk.Treeview(preview_tab, show="headings")
        self.add_scrollbars(preview_tab, self.preview)

        toolbar = ttk.Frame(tree_tab, padding=8)
        toolbar.pack(fill="x")
        self.view_buttons = []
        for label, command in (("−", lambda: self.zoom(0.8)), ("+", lambda: self.zoom(1.25)),
                               ("Ajustar à janela", self.fit_image), ("Árvore completa (SVG)", self.open_full_tree)):
            button = ttk.Button(toolbar, text=label, command=command, state="disabled")
            button.pack(side="left", padx=(0, 6))
            self.view_buttons.append(button)
        self.folder_button = ttk.Button(toolbar, text="Abrir pasta dos resultados", command=self.open_output, state="disabled")
        self.folder_button.pack(side="right")
        self.zoom_label = ttk.Label(toolbar, text="")
        self.zoom_label.pack(side="right", padx=10)
        canvas_frame = ttk.Frame(tree_tab)
        canvas_frame.pack(fill="both", expand=True)
        self.canvas = tk.Canvas(canvas_frame, background="white", highlightthickness=0)
        self.add_scrollbars(canvas_frame, self.canvas)
        self.canvas.create_text(350, 150, text="Importe um CSV e clique em Treinar para ver a árvore.", fill="#666")

        self.report = tk.Text(report_tab, wrap="word", font=("Consolas", 11), state="disabled", padx=12, pady=12)
        self.add_scrollbars(report_tab, self.report)
        ttk.Label(main, text="run: correr  •  duck: abaixar / acelerar queda  •  jump: pular").pack(anchor="w", pady=(12, 4))
        ttk.Label(main, text="A profundidade é comparada em validação; o modelo final usa todos os exemplos. A árvore aprende seus comandos.").pack(anchor="w")
        self.progress = ttk.Progressbar(main, mode="indeterminate")
        self.progress.pack(fill="x", pady=(10, 4))
        self.status = tk.StringVar(value="Selecione um ou mais arquivos CSV baixados do jogo.")
        ttk.Label(main, textvariable=self.status, wraplength=1000).pack(anchor="w")
        root.after(100, self.poll)

    @staticmethod
    def add_scrollbars(parent, widget):
        parent.rowconfigure(0, weight=1)
        parent.columnconfigure(0, weight=1)
        widget.grid(row=0, column=0, sticky="nsew")
        vertical = ttk.Scrollbar(parent, orient="vertical", command=widget.yview)
        vertical.grid(row=0, column=1, sticky="ns")
        horizontal = ttk.Scrollbar(parent, orient="horizontal", command=widget.xview)
        horizontal.grid(row=1, column=0, sticky="ew")
        widget.configure(yscrollcommand=vertical.set, xscrollcommand=horizontal.set)

    def choose_files(self):
        paths = filedialog.askopenfilenames(title="Importar partidas do T-Rex", filetypes=[("Arquivos CSV", "*.csv")])
        if paths:
            self.load_files(paths)

    def load_files(self, paths):
        try:
            with Path(paths[0]).open(encoding="utf-8-sig", newline="") as file:
                reader = csv.DictReader(file)
                columns = reader.fieldnames
                if not columns:
                    raise ValueError("O arquivo está vazio ou não contém cabeçalho.")
                # Only a small preview is loaded; training reads every selected file.
                rows = []
                for _, row in zip(range(100), reader):
                    rows.append([row.get(column, "") for column in columns])
        except (OSError, ValueError, csv.Error) as error:
            messagebox.showerror("Não foi possível importar", str(error), parent=self.root)
            return
        self.paths = [Path(path) for path in paths]
        self.preview.delete(*self.preview.get_children())
        self.preview.configure(columns=columns)
        for column in columns:
            self.preview.heading(column, text=column)
            self.preview.column(column, width=135, stretch=False)
        for row in rows:
            self.preview.insert("", "end", values=row)
        self.file_label.configure(text="Selecionados: " + "; ".join(str(path) for path in self.paths))
        self.train_button.configure(state="normal")
        self.notebook.select(0)
        self.status.set(f"{len(paths)} arquivo(s) selecionado(s). Prévia de até 100 linhas do primeiro arquivo. Pronto para treinar.")

    def start_training(self):
        if self.running or not self.paths:
            return
        try:
            depth = int(self.depth.get())
            if not 1 <= depth <= 24:
                raise ValueError
        except ValueError:
            messagebox.showerror("Profundidade inválida", "Escolha um número inteiro entre 1 e 24.", parent=self.root)
            return
        self.running = True
        for widget in (self.import_button, self.train_button, self.depth_input):
            widget.configure(state="disabled")
        self.progress.start()
        self.status.set("Treinando e gerando o desenho…")
        output = BASE_DIR / "resultados" / datetime.now().strftime("%Y-%m-%d_%H-%M-%S-%f")
        threading.Thread(target=self.worker, args=(list(self.paths), depth, output), daemon=True).start()

    def worker(self, paths, depth, output):
        try:
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"
            command = [sys.executable, str(BASE_DIR / "treinar_arvore.py"), *map(str, paths),
                       "--profundidade", str(depth), "--saida", str(output), "--sem-janela"]
            self.process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                            text=True, encoding="utf-8", env=env,
                                            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            stdout, stderr = self.process.communicate()
            if self.process.returncode:
                raise RuntimeError(stderr.strip() or stdout.strip() or "Falha ao treinar a árvore.")
            self.events.put((True, output, stdout))
        except Exception as error:
            self.events.put((False, output, str(error)))

    def poll(self):
        try:
            success, output, text = self.events.get_nowait()
        except queue.Empty:
            pass
        else:
            self.running = False
            self.progress.stop()
            for widget in (self.import_button, self.train_button, self.depth_input):
                widget.configure(state="normal")
            self.report.configure(state="normal")
            self.report.delete("1.0", "end")
            self.report.insert("1.0", text)
            self.report.configure(state="disabled")
            if success:
                self.output_dir = output
                self.folder_button.configure(state="normal")
                try:
                    from PIL import Image
                    with Image.open(output / "arvore.png") as image:
                        self.original_image = image.copy()
                    for button in self.view_buttons:
                        button.configure(state="normal")
                    self.notebook.select(self.tree_tab)
                    self.root.update_idletasks()
                    self.fit_image()
                    self.status.set(f"Concluído. Abra o jogo e carregue modelo.json da pasta {output}")
                except Exception as error:
                    self.status.set(f"Árvore salva em {output}. Não foi possível exibir a prévia.")
                    messagebox.showerror("Erro ao exibir desenho", str(error), parent=self.root)
            else:
                self.status.set("Não foi possível treinar. Confira o arquivo e tente novamente.")
                self.notebook.select(2)
                messagebox.showerror("Erro no treinamento", text, parent=self.root)
        self.root.after(100, self.poll)

    def fit_image(self):
        if self.original_image:
            width, height = self.original_image.size
            self.draw_image(min((max(100, self.canvas.winfo_width()) - 20) / width,
                                (max(100, self.canvas.winfo_height()) - 20) / height, 1.0))

    def zoom(self, factor):
        self.draw_image(max(0.02, min(2.0, self.scale * factor)))

    def draw_image(self, scale):
        if self.original_image is None:
            return
        from PIL import Image, ImageTk
        self.scale = scale
        width, height = self.original_image.size
        resized = self.original_image.resize((max(1, int(width * scale)), max(1, int(height * scale))), Image.Resampling.LANCZOS)
        self.image = ImageTk.PhotoImage(resized, master=self.root)
        self.canvas.delete("all")
        self.canvas.create_image(10, 10, anchor="nw", image=self.image)
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        self.zoom_label.configure(text=f"{scale:.0%}")

    def open_full_tree(self):
        if self.output_dir:
            os.startfile(self.output_dir / "arvore.svg")

    def open_output(self):
        if self.output_dir:
            os.startfile(self.output_dir)

    def close(self):
        if self.process is not None and self.process.poll() is None:
            self.process.terminate()
        self.root.destroy()


if __name__ == "__main__":
    TrainingApp(tk.Tk()).root.mainloop()
