import streamlit as st
import pickle
from datetime import datetime

# Load your machine learning model
model_fraud = pickle.load(open('model.pkl', 'rb'))

# Map days to numerical values for preprocessing (adjust as needed)
day_mapping = {'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 7}

st.title('Fraud Detection and Traffic Analysis')

# Input fields for fraud detection
st.header('Fraud Detection')
day_fraud = st.selectbox('Select the Day:', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
date_fraud = st.text_input('Enter the Date (e.g., YYYY-MM-DD):')
coded_day_fraud = st.text_input('Enter the Coded Day (if applicable):')
zone_fraud = st.text_input('Enter the Zone (if applicable):')
weather_fraud = st.text_input('Enter the Weather (e.g., Sunny, Rainy, etc.):')
temperature_fraud = st.text_input('Enter the Temperature (in Celsius):')

# Convert string features to numerical values
day_fraud_numeric = day_mapping.get(day_fraud.lower(), 0)  # Default to 0 if not found in mapping

# Convert the 'Date' feature to a numerical representation (example: using the number of days since a reference date)
reference_date = datetime(2000, 1, 1)  # Adjust the reference date as needed
date_fraud_numeric = (datetime.strptime(date_fraud, '%Y-%m-%d') - reference_date).days if date_fraud else 0

# Input field for simulating number of cars for traffic analysis
st.header('Traffic Analysis')
num_cars = st.slider('Select the number of cars:', min_value=0, max_value=100, value=10)

# Prediction buttons
if st.button('Predict Fraud'):
    # Convert inputs to appropriate data types
    data_fraud = [[day_fraud_numeric, date_fraud_numeric, coded_day_fraud, zone_fraud, weather_fraud, temperature_fraud]]
    result_fraud = model_fraud.predict(data_fraud)

    # Display result for fraud detection
    if result_fraud[0] == 0:
        st.success("Fraud is not detected")
    else:
        st.warning("Fraud is detected")

# Determine traffic level and status
if num_cars < 5:
    traffic_level = 1
    traffic_status = "No traffic detected"
elif 5 <= num_cars <= 15:
    traffic_level = 2
    traffic_status = "No traffic detected"
elif 15 < num_cars <= 30:
    traffic_level = 3
    traffic_status = "Traffic detected, please proceed with caution"
elif 30 < num_cars <= 50:
    traffic_level = 4
    traffic_status = "Traffic detected, expect delays"
else:
    traffic_level = 5
    traffic_status = "Traffic congestion, avoid the area if possible"

# Display results for traffic analysis
st.write(f"Number of cars: {num_cars}")
st.write(f"Traffic Level: {traffic_level}")
st.write(f"Traffic Status: {traffic_status}")
