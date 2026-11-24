import streamlit as st
import pickle
from datetime import datetime

# Load your machine learning model
model_traffic = pickle.load(open('model.pkl', 'rb'))

st.title('Traffic Analysis')

# Input fields for traffic analysis
st.header('TRAFFIC ANALYSIS')

coded_day_traffic = st.text_input('Enter the Coded Day (if applicable):')
zone_traffic = st.text_input('Enter the Zone (if applicable):')
weather_traffic = st.text_input('Enter the Weather (e.g., Sunny, Rainy, etc.):')
temperature_traffic = st.text_input('Enter the Temperature (in Celsius):')





# Prediction button for traffic analysis
if st.button('Predict Traffic'):
    # Convert inputs to appropriate data types
    data_traffic = [[ coded_day_traffic, zone_traffic, weather_traffic, temperature_traffic]]
    result_traffic = model_traffic.predict(data_traffic)

    # Display result for traffic analysis
    if result_traffic[0] > 2:
        st.warning("Traffic is detected. Expect delays.")
    else:
        st.success("No significant traffic detected. Have a safe journey!")
