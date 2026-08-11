import math
import random
import time
import tkinter as tk
from tkinter import font


# This class holds everything for the space-themed Tkinter window.
class SpaceHoverApp:
    def __init__(self, root):
        # Basic window settings.
        self.root = root
        self.root.title("Orbital Future Window")
        self.root.geometry("780x480")
        self.root.minsize(640, 420)
        self.root.configure(bg="#020008")

        # Fonts used by the labels inside the floating panel.
        self.title_font = font.Font(family="Helvetica", size=28, weight="bold")
        self.body_font = font.Font(family="Helvetica", size=13)
        self.small_font = font.Font(family="Helvetica", size=10, weight="bold")

        # These variables are used for animation.
        self.animation_time = 0
        self.last_frame_time = time.perf_counter()
        self.target_frame_delay = 8
        self.hover_amount = 0
        self.hover_target = 0
        self.hover_active = False
        self.stars = []
        self.asteroids = []
        self.particles = []
        self.panel_labels = []

        # The canvas is where the asteroids, stars, and background are drawn.
        self.canvas = tk.Canvas(root, bg="#020008", highlightthickness=0)
        self.canvas.pack(fill="both", expand=True)

        # Redraw the scene whenever the window is resized.
        self.canvas.bind("<Configure>", self.setup_scene)

        # This frame is the floating control panel in the middle.
        self.panel = tk.Frame(
            self.canvas,
            bg="#17102b",
            highlightbackground="#77f2dc",
            highlightthickness=1,
        )

        # Put the panel onto the canvas so it can be moved during animation.
        self.panel_window = self.canvas.create_window(
            390,
            240,
            window=self.panel,
            width=520,
            height=310,
        )

        # These bindings detect when the cursor moves over the floating panel.
        self.panel.bind("<Enter>", self.start_hover)
        self.panel.bind("<Leave>", self.end_hover)

        self.build_panel()
        self.setup_scene()
        self.animate()

    def build_panel(self):
        # Main title text inside the panel.
        title = tk.Label(
            self.panel,
            text="ORBITAL COMMAND",
            fg="#e4c1ff",
            bg="#17102b",
            font=self.title_font,
        )
        title.pack(pady=(34, 5))
        self.panel_labels.append(title)

        # Small status text under the title.
        subtitle = tk.Label(
            self.panel,
            text="NEBULA LINK: STABLE",
            fg="#77f2dc",
            bg="#17102b",
            font=self.small_font,
        )
        subtitle.pack()
        self.panel_labels.append(subtitle)

        # Main message in the center of the panel.
        message = tk.Label(
            self.panel,
            text="Floating above the purple edge of deep space.",
            fg="#f2ecff",
            bg="#17102b",
            font=self.body_font,
        )
        message.pack(pady=(35, 20))
        self.panel_labels.append(message)

        # Button styled with a complementary gold color.
        self.button = tk.Button(
            self.panel,
            text="ENGAGE",
            fg="#13091f",
            bg="#ffd166",
            activeforeground="#13091f",
            activebackground="#77f2dc",
            font=("Helvetica", 13, "bold"),
            relief="flat",
            cursor="hand2",
            padx=36,
            pady=10,
        )
        self.button.pack()
        self.button.bind("<Enter>", self.start_hover)
        self.button.bind("<Leave>", self.end_hover)

    def start_hover(self, event=None):
        # Turn on the hover effect when the cursor enters the panel.
        self.hover_target = 1
        self.hover_active = True

    def end_hover(self, event=None):
        # Wait briefly so the effect does not flicker when moving onto the button.
        self.root.after(40, self.check_hover_state)

    def check_hover_state(self):
        # Return to the normal look if the cursor is no longer over the panel.
        pointer_x = self.root.winfo_pointerx()
        pointer_y = self.root.winfo_pointery()
        panel_left = self.panel.winfo_rootx()
        panel_top = self.panel.winfo_rooty()
        panel_right = panel_left + self.panel.winfo_width()
        panel_bottom = panel_top + self.panel.winfo_height()

        pointer_is_over_panel = (
            panel_left <= pointer_x <= panel_right
            and panel_top <= pointer_y <= panel_bottom
        )

        if pointer_is_over_panel:
            return

        self.hover_target = 0
        self.hover_active = False

    def setup_scene(self, event=None):
        # Get the current window size so the drawing can scale with it.
        width = self.canvas.winfo_width()
        height = self.canvas.winfo_height()

        if width <= 1 or height <= 1:
            return

        # Clear the old background before drawing a new one.
        self.canvas.delete("background")
        self.stars = []
        self.asteroids = []
        self.particles = []

        # Draw a mostly black nebula background from top to bottom.
        for y in range(0, height, 4):
            blend = y / max(height, 1)
            red = int(2 + blend * 6)
            green = int(0 + blend * 3)
            blue = int(8 + blend * 12)
            color = f"#{red:02x}{green:02x}{blue:02x}"
            self.canvas.create_rectangle(
                0,
                y,
                width,
                y + 4,
                fill=color,
                outline="",
                tags="background",
            )

        # Star positions are stored as percentages so they resize with the window.
        star_points = [
            (0.08, 0.18, 2),
            (0.16, 0.36, 1),
            (0.23, 0.12, 1),
            (0.31, 0.27, 2),
            (0.43, 0.16, 1),
            (0.52, 0.33, 2),
            (0.61, 0.11, 1),
            (0.74, 0.24, 2),
            (0.84, 0.14, 1),
            (0.92, 0.38, 2),
            (0.12, 0.72, 1),
            (0.36, 0.81, 2),
            (0.67, 0.75, 1),
            (0.88, 0.68, 2),
        ]

        # Draw each star and remember it so it can twinkle later.
        for x_ratio, y_ratio, size in star_points:
            x = width * x_ratio
            y = height * y_ratio
            star = self.canvas.create_oval(
                x,
                y,
                x + size,
                y + size,
                fill="#f8f0ff",
                outline="",
                tags="background",
            )
            self.stars.append((star, x, y, size))

        # Soft particle dust: tiny, subtle purple/white dots that drift slowly.
        particle_points = [
            (0.10, 0.24, 1.0, 0.16, "#21133b"),
            (0.18, 0.58, 1.2, 0.12, "#3a2b58"),
            (0.27, 0.42, 0.8, 0.14, "#f2ecff"),
            (0.36, 0.17, 1.0, 0.10, "#2a1a4a"),
            (0.45, 0.79, 1.2, 0.15, "#4b3570"),
            (0.54, 0.36, 0.8, 0.11, "#f2ecff"),
            (0.63, 0.68, 1.0, 0.13, "#2d1d4f"),
            (0.72, 0.48, 1.2, 0.09, "#3f2f63"),
            (0.80, 0.21, 0.8, 0.12, "#f2ecff"),
            (0.90, 0.74, 1.1, 0.10, "#2a1a4a"),
        ]

        for x_ratio, y_ratio, size, speed, color in particle_points:
            x = width * x_ratio
            y = height * y_ratio
            particle = self.canvas.create_oval(
                x,
                y,
                x + size,
                y + size,
                fill=color,
                outline="",
                tags="background",
            )
            self.particles.append((particle, x, y, size, speed, color))

        # Draw mini asteroids around the window edges.
        asteroid_data = [
            (-0.02, 0.16, 18, 0.7, "#40394d"),
            (0.09, 0.04, 12, 1.1, "#53475f"),
            (0.28, -0.02, 16, 0.8, "#353044"),
            (0.52, 0.03, 10, 1.4, "#665875"),
            (0.77, -0.01, 19, 0.6, "#473d56"),
            (1.02, 0.13, 15, 1.0, "#5c4f6b"),
            (0.98, 0.38, 11, 1.5, "#393348"),
            (1.03, 0.69, 20, 0.7, "#514663"),
            (0.88, 1.02, 13, 1.2, "#6a5a7b"),
            (0.61, 0.97, 17, 0.9, "#43384f"),
            (0.33, 1.03, 21, 0.65, "#5a4d68"),
            (0.08, 0.94, 14, 1.3, "#3b3448"),
            (-0.03, 0.73, 19, 0.8, "#605270"),
            (0.02, 0.46, 12, 1.6, "#4c415c"),
        ]

        for x_ratio, y_ratio, radius, speed, color in asteroid_data:
            self.create_asteroid(width * x_ratio, height * y_ratio, radius, speed, color)

        # Keep all background items behind the floating panel.
        self.canvas.tag_lower("background")

    def create_asteroid(self, x, y, radius, speed, color):
        # Each asteroid is an uneven polygon so it looks like space rock.
        shape = [
            (-0.85, -0.30),
            (-0.42, -0.88),
            (0.22, -0.72),
            (0.84, -0.28),
            (0.62, 0.38),
            (0.18, 0.84),
            (-0.56, 0.62),
        ]
        points = []

        for x_offset, y_offset in shape:
            points.extend((x + x_offset * radius, y + y_offset * radius))

        asteroid = self.canvas.create_polygon(
            points,
            fill=color,
            outline="#a78bc4",
            width=1,
            tags=("background", "asteroid"),
        )
        highlight = self.canvas.create_line(
            x - radius * 0.38,
            y - radius * 0.3,
            x + radius * 0.12,
            y - radius * 0.46,
            fill="#d8c8ef",
            width=1,
            tags=("background", "asteroid"),
        )

        asteroid_data = {
            "asteroid": asteroid,
            "highlight": highlight,
            "x": x,
            "y": y,
            "radius": radius,
            "speed": speed,
            "shape": shape,
            "phase_x": x,
            "phase_y": y,
            "drift_x": 3 + radius * 0.12,
            "drift_y": 3 + radius * 0.10,
            "rotation_speed": 0.12 * speed,
        }

        self.asteroids.append(asteroid_data)
        self.canvas.tag_bind(asteroid, "<Button-1>", lambda event, item=asteroid_data: self.randomize_asteroid(item))
        self.canvas.tag_bind(highlight, "<Button-1>", lambda event, item=asteroid_data: self.randomize_asteroid(item))
        self.canvas.tag_bind(asteroid, "<Enter>", lambda event: self.canvas.config(cursor="hand2"))
        self.canvas.tag_bind(highlight, "<Enter>", lambda event: self.canvas.config(cursor="hand2"))
        self.canvas.tag_bind(asteroid, "<Leave>", lambda event: self.canvas.config(cursor=""))
        self.canvas.tag_bind(highlight, "<Leave>", lambda event: self.canvas.config(cursor=""))

    def randomize_asteroid(self, asteroid_data):
        # Clicking an asteroid gives it a new random movement path.
        radius = asteroid_data["radius"]
        asteroid_data["phase_x"] = random.uniform(0, math.tau)
        asteroid_data["phase_y"] = random.uniform(0, math.tau)
        asteroid_data["speed"] = random.uniform(0.45, 1.85)
        asteroid_data["drift_x"] = random.uniform(2, 10 + radius * 0.22)
        asteroid_data["drift_y"] = random.uniform(2, 9 + radius * 0.20)
        asteroid_data["rotation_speed"] = random.uniform(-0.24, 0.24)

        self.canvas.itemconfig(asteroid_data["asteroid"], outline="#ffd166")
        self.canvas.itemconfig(asteroid_data["highlight"], fill="#ffd166")
        self.root.after(260, lambda: self.restore_asteroid_color(asteroid_data))

    def restore_asteroid_color(self, asteroid_data):
        # Return the asteroid highlight color after the click flash.
        self.canvas.itemconfig(asteroid_data["asteroid"], outline="#a78bc4")
        self.canvas.itemconfig(asteroid_data["highlight"], fill="#d8c8ef")

    def smooth_step(self, amount):
        # Turns a normal 0 to 1 value into a softer start-and-end transition.
        return amount * amount * (3 - 2 * amount)

    def blend_color(self, start_color, end_color, amount):
        # Blends between two hex colors so hover colors fade instead of snapping.
        amount = max(0, min(1, amount))
        start = tuple(int(start_color[index:index + 2], 16) for index in (1, 3, 5))
        end = tuple(int(end_color[index:index + 2], 16) for index in (1, 3, 5))
        mixed = tuple(round(start[i] + (end[i] - start[i]) * amount) for i in range(3))
        return f"#{mixed[0]:02x}{mixed[1]:02x}{mixed[2]:02x}"

    def animate(self):
        # This method runs over and over to make the interface feel alive.
        width = self.canvas.winfo_width()
        height = self.canvas.winfo_height()
        current_time = time.perf_counter()
        delta_time = min(current_time - self.last_frame_time, 0.05)
        self.last_frame_time = current_time
        self.animation_time += delta_time

        # Move the center panel in a smooth floating motion at 120fps timing.
        hover_ease = 1 - math.pow(0.08, delta_time)
        self.hover_amount += (self.hover_target - self.hover_amount) * hover_ease
        smooth_hover = self.smooth_step(self.hover_amount)
        float_y = math.sin(self.animation_time * 0.9) * 5
        float_x = math.cos(self.animation_time * 0.65) * 2
        panel_width = 520 + smooth_hover * 18
        panel_height = 310 + smooth_hover * 12
        panel_x = width / 2 + float_x
        panel_y = height / 2 + float_y
        panel_color = self.blend_color("#17102b", "#21103f", smooth_hover)
        border_color = self.blend_color("#77f2dc", "#ffd166", smooth_hover)
        button_color = self.blend_color("#ffd166", "#77f2dc", smooth_hover)

        self.panel.config(bg=panel_color, highlightbackground=border_color)
        self.button.config(bg=button_color, activebackground=border_color)

        for label in self.panel_labels:
            label.config(bg=panel_color)

        self.canvas.itemconfig(self.panel_window, width=panel_width, height=panel_height)
        self.canvas.coords(self.panel_window, panel_x, panel_y)

        # Make the stars gently twinkle.
        for star, x, y, size in self.stars:
            glow = 0.58 + 0.35 * math.sin(self.animation_time * 1.1 + x)
            color = "#f8f0ff" if glow > 0.65 else "#a887ff"
            self.canvas.itemconfig(star, fill=color)
            self.canvas.coords(star, x, y, x + size + glow, y + size + glow)

        # Move the dust very slowly so the background feels alive.
        for particle, x, y, size, speed, color in self.particles:
            drift_x = math.cos(self.animation_time * speed + y) * 5
            drift_y = math.sin(self.animation_time * speed * 0.8 + x) * 4
            shimmer = 0.5 + 0.5 * math.sin(self.animation_time * speed + x)
            particle_color = color if shimmer > 0.25 else "#120b20"
            self.canvas.itemconfig(particle, fill=particle_color)
            self.canvas.coords(
                particle,
                x + drift_x,
                y + drift_y,
                x + drift_x + size,
                y + drift_y + size,
            )

        # Rotate and drift the edge asteroids.
        for asteroid, highlight, x, y, radius, speed, shape in self.asteroids:
            drift_x = math.cos(self.animation_time * 0.28 * speed + x) * (3 + radius * 0.12)
            drift_y = math.sin(self.animation_time * 0.34 * speed + y) * (3 + radius * 0.10)
            angle = self.animation_time * 0.12 * speed
            center_x = x + drift_x
            center_y = y + drift_y
            points = []

            for x_offset, y_offset in shape:
                rotated_x = x_offset * math.cos(angle) - y_offset * math.sin(angle)
                rotated_y = x_offset * math.sin(angle) + y_offset * math.cos(angle)
                points.extend((
                    center_x + rotated_x * radius,
                    center_y + rotated_y * radius,
                ))

            self.canvas.coords(asteroid, *points)
            self.canvas.coords(
                highlight,
                center_x - radius * 0.38,
                center_y - radius * 0.3,
                center_x + radius * 0.12,
                center_y - radius * 0.46,
            )

        # Run this animation method again after about 8ms, which targets 120fps.
        self.root.after(self.target_frame_delay, self.animate)


# Create the Tkinter window and start the app.
root = tk.Tk()
app = SpaceHoverApp(root)
root.mainloop()
