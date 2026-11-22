from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.dml import MSO_LINE_DASH_STYLE

OUT = "/home/kaiia/Dokumen/Tixify/tixify/Tixify_Presentasi.pptx"
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Tixify identity sampled from the app styles
INK = "F5F6F7"
INK2 = "FFFFFF"
LINE = "D9DEE5"
BLUE = "476A8A"
CORAL = "C77E6B"
YELLOW = "B48A3A"
PAPER = "252A31"
MUTED = "667085"
GREEN = "4E8069"
WHITE = "FFFFFF"
FONT = "Aptos"


def rgb(hexstr):
    return RGBColor.from_string(hexstr)


def rect(slide, x, y, w, h, fill, radius=False, line=None, lw=1):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
                                   Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid(); shape.fill.fore_color.rgb = rgb(fill)
    shape.line.color.rgb = rgb(line or fill); shape.line.width = Pt(lw)
    if radius:
        try: shape.adjustments[0] = 0.12
        except Exception: pass
    return shape


def line(slide, x1, y1, x2, y2, color=LINE, width=1.5, dash=None):
    sh = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    sh.line.color.rgb = rgb(color); sh.line.width = Pt(width)
    if dash: sh.line.dash_style = dash
    return sh


def text(slide, value, x, y, w, h, size=16, color=PAPER, bold=False, align=PP_ALIGN.LEFT,
         valign=MSO_ANCHOR.TOP, font=FONT, margin=0.03, italic=False):
    box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = box.text_frame; tf.clear(); tf.word_wrap = True
    tf.margin_left = Inches(margin); tf.margin_right = Inches(margin)
    tf.margin_top = Inches(margin); tf.margin_bottom = Inches(margin)
    tf.vertical_anchor = valign
    p = tf.paragraphs[0]; p.alignment = align
    p.space_after = Pt(0); p.space_before = Pt(0)
    r = p.add_run(); r.text = value
    r.font.name = font; r.font.size = Pt(size); r.font.bold = bold; r.font.italic = italic; r.font.color.rgb = rgb(color)
    return box


def bullet(slide, value, x, y, w, size=15, color=PAPER, dot=CORAL):
    text(slide, "•", x, y, 0.25, 0.34, size+2, dot, True)
    text(slide, value, x+0.27, y, w-0.27, 0.48, size, color)


def base(title=None, section=None):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s.background.fill.solid(); s.background.fill.fore_color.rgb = rgb(INK)
    # subtle top rule and footer
    rect(s, 0, 0, 13.333, 0.08, BLUE)
    if title:
        if section: text(s, section.upper(), 0.65, 0.42, 4, 0.25, 9, YELLOW, True)
        text(s, title, 0.65, 0.78, 12.0, 0.65, 27, PAPER, True)
    text(s, "TIXIFY  /  PLATFORM TIKET & MANAJEMEN EVENT", 0.65, 7.13, 8, 0.18, 8, MUTED)
    text(s, f"{len(prs.slides):02d}", 12.15, 7.1, 0.5, 0.22, 9, MUTED, False, PP_ALIGN.RIGHT)
    return s


def pill(slide, label, x, y, w, fill=INK2, color=YELLOW):
    rect(slide, x, y, w, 0.32, fill, True)
    text(slide, label, x+0.06, y+0.03, w-0.12, 0.2, 9, color, True, PP_ALIGN.CENTER)


def card(slide, x, y, w, h, title, body, accent=BLUE):
    rect(slide, x, y, w, h, INK2, True, LINE)
    rect(slide, x, y, 0.07, h, accent)
    text(slide, title, x+0.24, y+0.2, w-0.44, 0.36, 16, PAPER, True)
    text(slide, body, x+0.24, y+0.68, w-0.45, h-0.82, 12, MUTED)


def draw_ticket(slide, x, y, w, h, title="Neon Night Music Fest", status="LUNAS"):
    rect(slide, x, y, w, h, BLUE, True, BLUE)
    text(slide, "#TXF-9821", x+0.18, y+0.16, w*0.52, 0.22, 9, WHITE, True)
    pill(slide, status, x+w-1.0, y+0.13, 0.82, "355C7D", WHITE)
    text(slide, title, x+0.18, y+0.55, w-0.36, 0.6, 18, WHITE, True)
    text(slide, "Gelora Bung Karno  ·  Jakarta", x+0.18, y+1.24, w-0.36, 0.25, 10, "DDE4FF")
    # ticket stub
    rect(slide, x, y+h*0.62, w, h*0.38, WHITE)
    line(slide, x+0.05, y+h*0.62, x+w-0.05, y+h*0.62, "AAB4D6", 1, MSO_LINE_DASH_STYLE.DASH)
    text(slide, "2 TIKET", x+0.2, y+h*0.70, w*0.45, 0.22, 9, "66708E", True)
    text(slide, "Tunjukkan di pintu masuk", x+0.2, y+h*0.79, w*0.58, 0.25, 10, PAPER, True)
    draw_qr(slide, x+w-0.8, y+h*0.68, 0.55)


def draw_qr(slide, x, y, size):
    # stylized QR-like matrix for mockup only
    rect(slide, x, y, size, size, WHITE)
    cell=size/9
    for a,b in [(0,0),(6,0),(0,6)]:
        rect(slide,x+cell*a,y+cell*b,cell*3,cell*3,"1D2430")
        rect(slide,x+cell*(a+0.5),y+cell*(b+0.5),cell*2,cell*2,WHITE)
        rect(slide,x+cell*(a+1),y+cell*(b+1),cell,cell,"1D2430")
    for a,b in [(4,1),(4,3),(3,4),(5,5),(2,5),(6,4),(4,7),(7,6),(5,8)]:
        rect(slide,x+cell*a,y+cell*b,cell,cell,"1D2430")


def phone(slide, x, y, w, h, screen=INK, label=""):
    rect(slide,x,y,w,h,"303846",True,"9AA4B2",1.1)
    rect(slide,x+0.09,y+0.12,w-0.18,h-0.24,screen,True,screen)
    rect(slide,x+w*0.36,y+0.07,w*0.28,0.12,"303846",True,"303846")
    if label: text(slide,label,x-0.15,y+h+0.08,w+0.3,0.25,10,MUTED,True,PP_ALIGN.CENTER)
    return x+0.16,y+0.2,w-0.32,h-0.4


def entity(slide,x,y,w,h,name,fields,color=BLUE):
    rect(slide,x,y,w,h,INK2,True,LINE)
    rect(slide,x,y,w,0.42,color,True,color)
    # cover lower rounded part of header to make straight divider
    rect(slide,x,y+0.28,w,0.14,color)
    text(slide,name.upper(),x+0.15,y+0.09,w-0.3,0.23,12,WHITE,True)
    yy=y+0.53
    for f in fields:
        text(slide,f,x+0.15,yy,w-0.3,0.25,10,PAPER if f.startswith("PK") or f.startswith("FK") else MUTED)
        yy+=0.31


def use_case(slide, x, y, w, h, label):
    shape = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(w), Inches(h))
    shape.fill.solid(); shape.fill.fore_color.rgb = rgb("FFFFFF")
    shape.line.color.rgb = rgb(BLUE); shape.line.width = Pt(1.2)
    text(slide, label, x+0.12, y+0.12, w-0.24, h-0.18, 10, PAPER, False, PP_ALIGN.CENTER, MSO_ANCHOR.MIDDLE)


def actor(slide, cx, top, label):
    head = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(cx-0.12), Inches(top), Inches(0.24), Inches(0.24))
    head.fill.background(); head.line.color.rgb = rgb(PAPER); head.line.width = Pt(1.4)
    line(slide, cx, top+0.24, cx, top+0.78, PAPER, 1.4)
    line(slide, cx-0.27, top+0.43, cx+0.27, top+0.43, PAPER, 1.4)
    line(slide, cx, top+0.78, cx-0.23, top+1.12, PAPER, 1.4)
    line(slide, cx, top+0.78, cx+0.23, top+1.12, PAPER, 1.4)
    text(slide, label, cx-0.65, top+1.2, 1.3, 0.25, 10, PAPER, True, PP_ALIGN.CENTER)

# 1 cover
s=base()
# Simple cover layout with a restrained neutral panel
rect(s,8.0,0.8,4.7,5.8,INK2,True,LINE)
text(s,"TIXIFY",0.8,0.6,4,0.45,17,YELLOW,True)
text(s,"Platform tiket\ndan manajemen event",0.8,1.6,7.0,1.75,35,PAPER,True)
text(s,"Satu alur untuk menemukan event, memesan e-tiket,\ndan mengelola operasional acara.",0.85,3.75,6.2,0.85,17,MUTED)
pill(s,"WEBSITE  +  APLIKASI MOBILE",0.85,5.0,2.7)
text(s,"Presentasi produk",0.85,6.37,3,0.3,11,MUTED)
# ticket graphic
# recreate card on top of dark backdrop
draw_ticket(s,8.75,1.55,3.1,3.45)
text(s,"Discover  ·  Book  ·  Check-in",8.55,5.55,3.6,0.35,12,PAPER,True,PP_ALIGN.CENTER)

# 2 objective
s=base("Tujuan & masalah yang diselesaikan","01 — Konteks")
text(s,"Tixify menyatukan pengalaman pengunjung dan pekerjaan pengelola event dalam satu ekosistem.",0.7,1.55,11.8,0.6,17,MUTED)
card(s,0.7,2.45,3.8,2.6,"Sebelum acara","Informasi event dan kuota tersebar; proses pesan serta cek status tiket terasa terpisah.",CORAL)
card(s,4.75,2.45,3.8,2.6,"Saat acara","Verifikasi tiket perlu cepat, konsisten, dan mencegah tiket yang sama dipakai berulang.",YELLOW)
card(s,8.8,2.45,3.8,2.6,"Operasional","Pengelola butuh satu tempat untuk memantau event, pesanan, pembayaran, dan check-in.",BLUE)
text(s,"TUJUAN PRODUK",0.75,5.55,2.3,0.3,10,YELLOW,True)
for i,t in enumerate(["Memudahkan penemuan dan pemesanan tiket.","Menyediakan e-tiket berkode unik/QR.","Membantu staf mengelola booking dan check-in."]):
    bullet(s,t,0.75+i*4.05,5.98,3.75,12)

# 3 overview and roles
s=base("Penjelasan sistem","02 — Gambaran")
text(s,"Tiga permukaan aplikasi bekerja melalui API yang sama.",0.7,1.5,8,0.35,16,MUTED)
# flow blocks
card(s,0.7,2.2,3.3,1.65,"Website publik","Katalog event, pengenalan layanan, dan pencarian status pesanan.",CORAL)
card(s,5.0,2.2,3.3,1.65,"Aplikasi mobile","Cari event, booking, lihat e-tiket dan simpan kode pesanan.",BLUE)
card(s,9.3,2.2,3.3,1.65,"Dashboard admin","Kelola event, pesanan, pengguna, persetujuan booking, dan check-in.",YELLOW)
for xx in [4.1,8.4]:
    line(s,xx,3.0,xx+0.75,3.0,YELLOW,2)
    text(s,"›",xx+0.26,2.72,0.3,0.45,24,YELLOW,True,PP_ALIGN.CENTER)
rect(s,2.2,4.55,8.9,1.5,INK2,True,LINE)
text(s,"API BACKEND  ·  Express",2.55,4.83,2.5,0.3,15,PAPER,True)
text(s,"Validasi request  •  autentikasi role  •  logika booking  •  integrasi Supabase",2.55,5.28,7.8,0.35,12,MUTED)
line(s,2.35,3.9,3.65,4.55,LINE,1.6); line(s,6.65,3.9,6.65,4.55,LINE,1.6); line(s,10.95,3.9,9.65,4.55,LINE,1.6)
text(s,"Penyimpanan data relasional + Supabase Auth untuk identitas dan role.",2.3,6.35,8.7,0.32,12,YELLOW,False,PP_ALIGN.CENTER)

# 4 customer/admin flows
s=base("Alur penggunaan utama","03 — Proses")
text(s,"PENGUNJUNG",0.75,1.55,2.2,0.3,10,YELLOW,True)
steps=[("01","Temukan event"),("02","Isi data & jumlah"),("03","Booking dibuat"),("04","Cek status / QR")]
for i,(num,label) in enumerate(steps):
    xx=0.75+i*3.1
    rect(s,xx,2.0,2.55,1.05,INK2,True,LINE)
    text(s,num,xx+0.18,2.17,0.45,0.3,13,CORAL,True)
    text(s,label,xx+0.65,2.16,1.75,0.45,13,PAPER,True)
    if i<3: line(s,xx+2.55,2.53,xx+3.03,2.53,YELLOW,2)
text(s,"PENGELOLA / STAF",0.75,3.72,3,0.3,10,YELLOW,True)
steps2=[("01","Login berbasis role"),("02","Kelola event / booking"),("03","Validasi tiket"),("04","Check-in tercatat")]
for i,(num,label) in enumerate(steps2):
    xx=0.75+i*3.1
    rect(s,xx,4.17,2.55,1.05,INK2,True,LINE)
    text(s,num,xx+0.18,4.34,0.45,0.3,13,BLUE,True)
    text(s,label,xx+0.65,4.3,1.75,0.52,12,PAPER,True)
    if i<3: line(s,xx+2.55,4.7,xx+3.03,4.7,YELLOW,2)
rect(s,0.75,5.82,11.85,0.66,"EEF1F4",True,"EEF1F4")
text(s,"Aturan penting: check-in hanya untuk tiket valid dari pesanan lunas; tiket yang sudah digunakan ditolak.",1.0,6.0,11.3,0.28,12,MUTED,False,PP_ALIGN.CENTER)

# 5 ERD
s=base("ERD — struktur data inti","04 — Data")
text(s,"Entitas aplikasi yang didefinisikan di schema; identitas pengguna/role dikelola Supabase Auth.",0.7,1.48,12,0.34,12,MUTED)
entity(s,0.8,2.0,3.35,3.55,"events",["PK  id : uuid","name : text","venue : text","event_date : timestamptz","price : integer","stock : integer","description : text"],BLUE)
entity(s,5.0,1.82,3.55,4.25,"orders",["PK  id : uuid","UK  code : text","FK  event_id : uuid","buyer_name : text","buyer_email : text","qty : integer","total : integer","status : pending / paid / cancelled","approval_status : pending / accepted","accepted_at / accepted_by"],CORAL)
entity(s,9.4,2.0,3.1,3.55,"tickets",["PK  id : uuid","FK  order_id : uuid","UK  code : text","status : valid / used","used_at : timestamptz","created_at : timestamptz"],YELLOW)
# relationships, lines first visually over boxes? arrows in gaps
line(s,4.15,3.73,5.0,3.73,YELLOW,2)
text(s,"1",4.22,3.35,0.2,0.22,10,YELLOW,True,PP_ALIGN.CENTER)
text(s,"N",4.72,3.35,0.2,0.22,10,YELLOW,True,PP_ALIGN.CENTER)
line(s,8.55,3.73,9.4,3.73,YELLOW,2)
text(s,"1",8.62,3.35,0.2,0.22,10,YELLOW,True,PP_ALIGN.CENTER)
text(s,"N",9.12,3.35,0.2,0.22,10,YELLOW,True,PP_ALIGN.CENTER)
text(s,"Satu event memiliki banyak pesanan; satu pesanan menghasilkan beberapa tiket (umumnya sejumlah qty).",1.0,6.36,11.3,0.28,11,MUTED,False,PP_ALIGN.CENTER)

# 6 UML use case
s=base("UML — use case pengguna","05 — Perancangan")
text(s,"Diagram ini merangkum interaksi utama tiap peran dengan sistem Tixify.",0.7,1.48,12,0.32,12,MUTED)
# system boundary
boundary = rect(s,3.0,1.95,7.45,4.45,"FFFFFF",False,LINE,1.2)
text(s,"SISTEM TIXIFY",3.28,2.1,2.0,0.25,10,BLUE,True)
# Associations are drawn behind use-case ellipses.
line(s,2.05,3.25,4.0,2.75,LINE,1.1)
line(s,2.05,3.25,4.0,3.8,LINE,1.1)
line(s,2.05,3.25,4.0,4.85,LINE,1.1)
line(s,11.25,2.75,9.45,2.75,LINE,1.1)
line(s,11.25,2.75,9.45,3.8,LINE,1.1)
line(s,11.25,5.1,9.45,4.85,LINE,1.1)
line(s,11.25,5.1,8.65,5.7,LINE,1.1)
actor(s,1.85,2.35,"Pengunjung")
actor(s,11.45,1.9,"Admin")
actor(s,11.45,4.45,"Staf")
use_case(s,4.0,2.4,2.65,0.7,"Lihat / cari event")
use_case(s,4.0,3.45,2.65,0.7,"Buat booking")
use_case(s,4.0,4.5,2.65,0.7,"Cek pesanan & e-tiket")
use_case(s,7.0,2.4,2.45,0.7,"Kelola event")
use_case(s,7.0,3.45,2.45,0.7,"Kelola pesanan & pengguna")
use_case(s,7.0,4.5,2.45,0.7,"Setujui booking")
use_case(s,6.2,5.35,2.45,0.7,"Validasi & check-in tiket")
text(s,"Pembayaran pada implementasi saat ini dicatat sebagai perubahan status pesanan.",2.4,6.62,8.6,0.24,10,MUTED,False,PP_ALIGN.CENTER)

# 7 website mockup
s=base("Mockup website publik","06 — Antarmuka web")
text(s,"Konsep visual mengikuti website Tixify: landing page, katalog event, fitur, dan cek pesanan.",0.7,1.48,12,0.32,12,MUTED)
# browser frame
rect(s,0.8,1.95,8.4,4.65,"FFFFFF",True,LINE,1.0)
rect(s,0.8,1.95,8.4,0.38,"EEF1F4",True,"EEF1F4")
for i,c in enumerate([CORAL,YELLOW,GREEN]): rect(s,1.02+i*0.2,2.08,0.1,0.1,c,True,c)
text(s,"tixify.app",4.0,2.05,2.0,0.18,8,MUTED,False,PP_ALIGN.CENTER)
# nav/logo
rect(s,1.1,2.52,0.28,0.28,CORAL,True,CORAL); text(s,"T",1.1,2.55,0.28,0.2,10,INK,True,PP_ALIGN.CENTER)
text(s,"Tixify",1.48,2.53,1.0,0.25,13,PAPER,True)
text(s,"Event     Fitur     Aplikasi     Cek tiket",5.3,2.56,3.2,0.2,8,MUTED,False,PP_ALIGN.RIGHT)
line(s,1.1,2.94,8.9,2.94,LINE,0.8)
text(s,"Tiket konser, sekali\nketuk di ponsel.",1.15,3.24,4.25,1.0,22,PAPER,True)
text(s,"Pilih event, pesan, lalu tunjukkan QR di pintu masuk.",1.18,4.38,3.7,0.48,10,MUTED)
rect(s,1.18,5.08,1.55,0.42,CORAL,True,CORAL); text(s,"Download aplikasi",1.22,5.2,1.47,0.18,8,INK,True,PP_ALIGN.CENTER)
rect(s,2.9,5.08,1.65,0.42,INK2,True,LINE); text(s,"Cek status pesanan",2.95,5.2,1.55,0.18,8,PAPER,True,PP_ALIGN.CENTER)
# ticket hero
rect(s,5.7,3.2,2.55,2.2,BLUE,True,BLUE)
text(s,"#TXF-9821     ✓ LUNAS",5.9,3.4,2.1,0.2,8,WHITE,True)
text(s,"Neon Night\nMusic Fest",5.9,3.78,2.1,0.65,16,WHITE,True)
text(s,"GBK · Jakarta",5.9,4.52,2.0,0.2,8,"DDE4FF")
rect(s,5.7,4.92,2.55,0.48,WHITE)
text(s,"2 tiket",5.9,5.04,1.0,0.2,8,PAPER,True); draw_qr(s,7.65,4.98,0.38)
# right explanation
card(s,9.65,2.05,2.95,1.12,"Tujuan","Promosi produk dan event.",CORAL)
card(s,9.65,3.42,2.95,1.12,"Aksi utama","Lihat event dan cari status pesanan.",YELLOW)
card(s,9.65,4.79,2.95,1.12,"Pengguna","Pengunjung / calon pembeli.",BLUE)
text(s,"Mockup presentasi — bukan screenshot aktual.",9.68,6.25,2.9,0.26,9,MUTED,False,PP_ALIGN.CENTER,italic=True)

# 8 mobile mockups
s=base("Mockup aplikasi mobile","07 — Antarmuka mobile")
text(s,"Dua layar utama: eksplorasi dan booking event, lalu pencarian pesanan serta e-tiket QR.",0.7,1.48,12,0.32,12,MUTED)
# phone 1
sx,sy,sw,sh=phone(s,1.15,1.95,2.55,4.55,INK2,"01  ·  Temukan event")
text(s,"Tixify",sx+0.1,sy+0.22,sw-0.2,0.26,14,PAPER,True)
rect(s,sx+0.08,sy+0.62,sw-0.16,0.38,"F0F2F5",True,"D9DEE5")
text(s,"⌕  Cari event atau lokasi",sx+0.2,sy+0.72,sw-0.4,0.16,7,MUTED)
text(s,"Temukan event\nfavoritmu.",sx+0.1,sy+1.15,sw-0.2,0.72,16,PAPER,True)
for j,(name,loc,price) in enumerate([("Neon Night Fest","Jakarta","Rp450.000"),("Jazz in the Park","Bandung","Rp275.000")]):
    yy=sy+2.08+j*1.03
    rect(s,sx+0.06,yy,sw-0.12,0.91,"F8F9FB",True,"D9DEE5")
    rect(s,sx+0.18,yy+0.13,0.48,0.45,BLUE,True,BLUE)
    text(s,"♫",sx+0.18,yy+0.21,0.48,0.2,12,WHITE,True,PP_ALIGN.CENTER)
    text(s,name,sx+0.75,yy+0.13,sw-0.95,0.22,8,PAPER,True)
    text(s,loc+"  ·  "+price,sx+0.75,yy+0.42,sw-0.95,0.18,6,MUTED)
    rect(s,sx+0.75,yy+0.65,0.9,0.18,CORAL,True,CORAL)
    text(s,"Pesan tiket",sx+0.77,yy+0.68,0.86,0.12,6,WHITE,True,PP_ALIGN.CENTER)
# phone 2
sx2,sy2,sw2,sh2=phone(s,4.5,1.95,2.55,4.55,INK2,"02  ·  E-tiket & status")
text(s,"Tiketku",sx2+0.1,sy2+0.24,sw2-0.2,0.26,14,PAPER,True)
text(s,"Masukkan kode pesanan",sx2+0.1,sy2+0.72,sw2-0.2,0.2,7,MUTED)
rect(s,sx2+0.08,sy2+0.98,sw2-0.16,0.38,"F0F2F5",True,"D9DEE5")
text(s,"A2425C55",sx2+0.2,sy2+1.08,sw2-0.9,0.16,8,PAPER,True)
rect(s,sx2+sw2-0.66,sy2+1.02,0.48,0.28,BLUE,True,BLUE); text(s,"Cari",sx2+sw2-0.63,sy2+1.08,0.42,0.14,7,WHITE,True,PP_ALIGN.CENTER)
# ticket in mobile
rect(s,sx2+0.08,sy2+1.62,sw2-0.16,2.0,BLUE,True,BLUE)
text(s,"#A2425C55       ✓ LUNAS",sx2+0.2,sy2+1.8,sw2-0.4,0.18,7,WHITE,True)
text(s,"Neon Night\nMusic Fest",sx2+0.2,sy2+2.12,sw2-0.4,0.52,13,WHITE,True)
text(s,"Jakarta  ·  25 Okt 2026",sx2+0.2,sy2+2.74,sw2-0.4,0.18,7,"DDE4FF")
rect(s,sx2+0.2,sy2+3.05,sw2-0.4,0.42,WHITE,True,LINE)
text(s,"QR TIKET",sx2+0.2,sy2+3.17,sw2-0.4,0.16,8,PAPER,True,PP_ALIGN.CENTER)
# features
card(s,7.75,2.0,4.8,1.2,"Pemesanan ringkas","Pilih jumlah tiket, isi nama dan email, lalu booking.",CORAL)
card(s,7.75,3.48,4.8,1.2,"Kode pesanan tersimpan","Kode terbaru disimpan lokal agar mudah ditemukan kembali.",YELLOW)
card(s,7.75,4.96,4.8,1.2,"QR siap ditunjukkan","Status dan detail tiket bisa dicek dari tab Tiketku.",BLUE)
text(s,"Mockup ilustratif berdasarkan alur aplikasi; data pada layar adalah contoh.",7.8,6.45,4.7,0.25,9,MUTED,False,PP_ALIGN.CENTER,italic=True)

# 9 admin mockup
s=base("Mockup dashboard pengelola","08 — Operasional")
text(s,"Dashboard web membantu admin dan staf menjalankan kegiatan sebelum hingga hari-H.",0.7,1.48,12,0.32,12,MUTED)
# mock browser
rect(s,0.75,1.95,8.6,4.65,"FFFFFF",True,LINE,1.0)
rect(s,0.75,1.95,1.65,4.65,"F0F2F5",True,"F0F2F5")
text(s,"TIXIFY",0.98,2.22,1.2,0.25,12,YELLOW,True)
for i,label in enumerate(["Overview","Events","Orders","Users","Check-in"]):
    yy=2.85+i*0.55
    if i==0: rect(s,0.9,yy-0.07,1.32,0.38,BLUE,True,BLUE)
    text(s,label,1.08,yy,1.0,0.2,9,WHITE if i==0 else MUTED,i==0)
text(s,"Dashboard",2.72,2.24,3.0,0.34,17,PAPER,True)
text(s,"Ringkasan operasional event",2.74,2.65,3.0,0.22,8,MUTED)
# stat cards
for i,(label,val,col) in enumerate([("EVENT AKTIF","08",BLUE),("PESANAN","124",CORAL),("MENUNGGU","17",YELLOW)]):
    xx=2.7+i*2.0
    rect(s,xx,3.1,1.78,0.85,INK2,True,LINE)
    text(s,label,xx+0.12,3.23,1.5,0.16,7,MUTED,True)
    text(s,val,xx+0.12,3.47,1.5,0.29,17,col,True)
# table
rect(s,2.7,4.2,6.25,1.85,INK2,True,LINE)
text(s,"Pesanan terbaru",2.9,4.38,2.5,0.25,10,PAPER,True)
for j,(code,event,status) in enumerate([("A2425C55","Neon Night Fest","Lunas"),("B18C912A","Jazz in the Park","Menunggu"),("C42AB830","City Run","Pending")]):
    yy=4.8+j*0.38
    line(s,2.9,yy+0.29,8.72,yy+0.29,LINE,0.6)
    text(s,code,2.9,yy,1.15,0.2,7,MUTED)
    text(s,event,4.25,yy,2.2,0.2,7,PAPER)
    text(s,status,7.35,yy,1.15,0.2,7,GREEN if status=="Lunas" else YELLOW,True)
# side info
card(s,9.75,2.05,2.85,1.15,"Admin","Kelola event, status pembayaran, dan pengguna.",CORAL)
card(s,9.75,3.48,2.85,1.15,"Staf","Tinjau booking dan jalankan check-in tiket.",YELLOW)
card(s,9.75,4.91,2.85,1.15,"Keamanan alur","QR yang telah digunakan tidak bisa dipakai kembali.",BLUE)
text(s,"Mockup presentasi — bukan screenshot aktual.",9.72,6.35,2.9,0.24,9,MUTED,False,PP_ALIGN.CENTER,italic=True)

# 10 scope notes / closing
s=base("Ringkasan & ruang pengembangan","09 — Penutup")
text(s,"Tixify menghubungkan pengalaman pembeli dengan kendali operasional event.",0.75,1.55,11.8,0.5,18,PAPER,True)
card(s,0.75,2.45,3.75,2.25,"Yang sudah tersedia","Website publik, aplikasi Expo, API Express, data Supabase, autentikasi role, dan QR check-in.",GREEN)
card(s,4.8,2.45,3.75,2.25,"Catatan implementasi","Alur pembayaran saat ini berupa perubahan status di aplikasi; integrasi payment gateway nyata belum terlihat di kode.",YELLOW)
card(s,8.85,2.45,3.75,2.25,"Arah berikutnya","Integrasi payment gateway, notifikasi transaksi, analitik event, dan publikasi aplikasi mobile.",CORAL)
rect(s,0.75,5.35,11.85,0.85,BLUE,True,BLUE)
text(s,"TIXIFY",1.0,5.52,2.3,0.38,20,WHITE,True)
text(s,"Temukan event. Pesan tiket. Nikmati acaranya.",3.3,5.58,8.85,0.3,15,WHITE,True,PP_ALIGN.RIGHT)
text(s,"Materi disusun dari struktur proyek dan alur aplikasi yang tersedia; mockup bersifat ilustratif.",0.85,6.55,11.5,0.28,10,MUTED,False,PP_ALIGN.CENTER)

prs.core_properties.title = "Tixify — Platform Tiket dan Manajemen Event"
prs.core_properties.subject = "Tujuan, penjelasan, ERD, serta mockup website dan mobile"
prs.core_properties.author = "OpenAI"
prs.core_properties.keywords = "Tixify, tiket, event, ERD, mockup"
prs.save(OUT)
print(OUT)
