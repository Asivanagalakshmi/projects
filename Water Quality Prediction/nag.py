import streamlit as st
import base64

def get_img_as_base64(file):
    with open(file, "rb") as f:
        data = f.read()
    return base64.b64encode(data).decode()

# Get base64 string for the image
img = get_img_as_base64("image.jpg")

# Define CSS for the background image
page_bg_img = f"""
<style>
body {{
    background-image: url("https://media.istockphoto.com/id/1390096793/photo/environment-engineer-collect-samples-of-wastewater-from-industrial-canals-in-test-tube-close.jpg?s=1024x1024&w=is&k=20&c=m1a6yYm4KXnLBIFGh4mBqTPYw4v-g70CLNIZj94Fq0s=");
    background-size: cover;
}}
</style>
"""

# Inject the CSS into Streamlit app
st.markdown(page_bg_img, unsafe_allow_html=True)

# Add your Streamlit content here
st.title("Water Quality Prediction")

pH = st.text_input("Enter the pH value:")
H = st.text_input("Enter the Hardness value:")
S = st.text_input("Enter the Solids value:")
Ch = st.text_input("Enter the Chloramines value:")
Su = st.text_input("Enter the Sulfate value:")
Co = st.text_input("Enter the Conductivity value:")
Oc = st.text_input("Enter the Organic_carbon value:")
T = st.text_input("Enter the Trihalomethanes value:")
Tur = st.text_input("Enter the Turbidity value:")

if st.button('Predict'):
    pH = float(pH)
    H = float(H)
    S = float(S)
    Ch = float(Ch)
    Su = float(Su)
    Co = float(Co)
    Oc = float(Oc)
    T = float(T)
    Tur = float(Tur)

    data = [[pH, H, S, Ch, Su, Co, Oc, T, Tur]]
    result = model.predict(data)
    st.success(result)

    if result[0] == 0:
        st.write("Unfit for Drinking")
    else:
        st.write("Set For Drinking Water")
